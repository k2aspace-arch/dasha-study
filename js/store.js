// Хранилище: Supabase (облако, вход по почте) или, если оно не настроено, этот браузер.
// Документы: таблица docs (key -> JSON). Файлы: бакет "files", папка = id пользователя.
(function(){
  const cfg = window.APP_CONFIG || {};
  const cloud = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = cloud ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const LS = "dasha:";
  let user = null;
  const cache = {};
  // общие данные учебников (PDF, страницы, оглавление, карточки): видны всем, у каждого может быть своя версия
  const shared = {}, sharedOwner = {};
  const SHARED = /^(book|toc|idx)-/;
  // путь в бакете: общие файлы лежат в папке shared/, свои — в папке пользователя
  const fp = path => path.startsWith("shared/") ? path : user.id+"/"+path;
  const timers = {}, chains = {};

  /* ---------- IndexedDB: локальные файлы и кэш скачанных ---------- */
  let dbp = null;
  function idb(){
    if(!dbp) dbp = new Promise((res,rej)=>{ try{
      const r = indexedDB.open("dasha-study", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }catch(e){ rej(e) } });
    return dbp;
  }
  async function idbPut(k, v){ const d = await idb(); return new Promise((res,rej)=>{ const t=d.transaction("files","readwrite"); t.objectStore("files").put(v,k); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); }); }
  async function idbGet(k){ try{ const d = await idb(); return await new Promise(res=>{ const q=d.transaction("files","readonly").objectStore("files").get(k); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null } }
  async function idbDel(k){ try{ const d = await idb(); await new Promise(res=>{ const t=d.transaction("files","readwrite"); t.objectStore("files").delete(k); t.oncomplete=res; t.onerror=res; }); }catch(e){} }

  const lsGet = k => { try{ return JSON.parse(localStorage.getItem(LS+k)||"null") }catch(e){ return null } };
  const lsSet = (k,v) => { try{ localStorage.setItem(LS+k, JSON.stringify(v)) }catch(e){} };

  const Store = {
    mode: cloud ? "cloud" : "local",
    get user(){ return user },

    async init(){
      if(!cloud) return;
      const { data } = await sb.auth.getSession();
      user = data.session ? data.session.user : null;
      sb.auth.onAuthStateChange((_e, s)=>{ const was = user && user.id; user = s ? s.user : null; if((user&&user.id)!==was && Store.onAuth) Store.onAuth(user); });
      if(user) await Store.loadAll();
    },
    async signIn(email, password){ const { error } = await sb.auth.signInWithPassword({email, password}); if(error) throw error; },
    async signUp(email, password){ const { data, error } = await sb.auth.signUp({email, password}); if(error) throw error; return !!data.session; },
    async signOut(){ await sb.auth.signOut(); Object.keys(cache).forEach(k=>delete cache[k]); Object.keys(shared).forEach(k=>{ delete shared[k]; delete sharedOwner[k]; }); },
    // действия администратора идут через серверную функцию: секретный ключ есть только там
    async admin(payload){ return Store.ask(Object.assign({ admin:true }, payload)); },

    async loadAll(){
      const { data, error } = await sb.from("docs").select("key,value");
      if(error) throw error;
      (data||[]).forEach(r=>{ cache[r.key] = r.value; lsSet(r.key, r.value); });
      try{ const sh = await sb.from("shared").select("key,value,owner"); (sh.data||[]).forEach(r=>{ shared[r.key] = r.value; sharedOwner[r.key] = r.owner; }); }catch(e){}
    },
    // своя версия, а если её нет — общая
    get(key, fallback){
      if(key in cache) return cache[key];
      const v = lsGet(key);
      if(v !== null && !cloud){ cache[key] = v; return v; }
      if(SHARED.test(key) && key in shared) return shared[key];
      return fallback;
    },
    hasOwn(key){ return key in cache && cache[key] !== null; },
    getShared(key){ return key in shared ? shared[key] : null; },
    sharedMine(key){ return !(key in shared) || sharedOwner[key] === (user && user.id); },
    async setShared(key, value){
      if(!cloud || !user) return;
      shared[key] = value; sharedOwner[key] = user.id;
      const { error } = await sb.from("shared").upsert({ key, value, owner:user.id, updated_at:new Date().toISOString() });
      if(error) console.warn("shared", key, error.message);
    },
    keys(){ const out = new Set(Object.keys(cache)); try{ for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); if(k && k.startsWith(LS)) out.add(k.slice(LS.length)); } }catch(e){} return [...out]; },
    async del(key){
      clearTimeout(timers[key]); delete cache[key]; try{ localStorage.removeItem(LS+key) }catch(e){}
      if(cloud && user){ const { error } = await sb.from("docs").delete().eq("user_id", user.id).eq("key", key); if(error) throw error; }
    },
    async flush(){ await Promise.all(Object.values(chains)); },
    async updateUser(v){ const { error } = await sb.auth.updateUser(v); if(error) throw error; },
    // запись с задержкой: частые изменения сливаются в одну
    set(key, value, delay){
      cache[key] = value; lsSet(key, value);
      if(!cloud || !user) return Promise.resolve();
      clearTimeout(timers[key]);
      return new Promise(res=>{
        timers[key] = setTimeout(()=>{
          chains[key] = (chains[key]||Promise.resolve()).then(async()=>{
            const { error } = await sb.from("docs").upsert({ user_id:user.id, key, value: cache[key], updated_at: new Date().toISOString() });
            if(error){ console.warn("save", key, error.message); if(Store.onSaveError) Store.onSaveError(error); }
            // общая версия учебника обновляется, пока её владелец — этот пользователь (или её ещё нет)
            if(SHARED.test(key) && Store.sharedMine(key)) await Store.setShared(key, cache[key]);
          }).finally(res);
        }, delay ?? 500);
      });
    },

    /* файлы */
    async putFile(path, blob){
      await idbPut("f:"+path, blob).catch(()=>{});
      if(!cloud) return;
      // в общую папку shared/ кладём только новые файлы (у каждого своё имя): перезапись там запрещена правилами
      const { error } = await sb.storage.from("files").upload(fp(path), blob, { upsert: !path.startsWith("shared/"), contentType: blob.type || "application/octet-stream" });
      if(error) throw error;
    },
    async getFile(path){
      const local = await idbGet("f:"+path);
      if(local) return local;
      if(!cloud || !user) return null;
      const { data, error } = await sb.storage.from("files").download(fp(path));
      if(error) throw error;
      idbPut("f:"+path, data).catch(()=>{});
      return data;
    },
    async removeFile(path){
      await idbDel("f:"+path);
      if(cloud && user) await sb.storage.from("files").remove([fp(path)]);
    },
    maxPart: cloud ? 45*1024*1024 : Infinity,

    /* ИИ-учитель */
    aiAvailable(){ return cloud && !!cfg.AI_ENABLED && !!user },
    async ask(payload){
      const { data, error } = await sb.functions.invoke(cfg.TUTOR_FUNCTION || "tutor", { body: payload });
      if(error){
        let msg = "";
        try{ const j = await error.context.json(); msg = j.error || ""; }catch(e){}
        if(msg === "Пустой вопрос" && ["tts","tocpages","anskey","transcribe","pagenum"].includes(payload.mode)) msg = "на сервере старая версия функции ИИ-учителя (tutor-for-dasha-study). Замени её код на новый (во второй строке openrouter-9) и нажми Deploy";
        throw new Error(msg || error.message || "Ошибка ИИ");
      }
      return data;
    }
  };
  window.Store = Store;
})();
