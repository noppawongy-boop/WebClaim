/* Reliable per-record Firebase sync for WebClaim.
   Keeps the existing /claims data in place and never replaces the whole collection. */
(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyCCTy4rquaTl9dAgIJ-qAHVu373uPUOgxk",
    authDomain: "repairt-monitor.firebaseapp.com",
    databaseURL: "https://repairt-monitor-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "repairt-monitor",
    storageBucket: "repairt-monitor.firebasestorage.app",
    messagingSenderId: "68506921227",
    appId: "1:68506921227:web:470d2acdfaf6f3dfcb5a0e",
    measurementId: "G-6N7J1CHPVT"
  };

  const status = document.createElement('div');
  status.id = 'cloudStatus';
  status.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:20;padding:7px 10px;border-radius:99px;background:#fff;border:1px solid #cbd0c8;box-shadow:0 3px 12px #0002;font:11px Tahoma;color:#68736e';
  status.textContent = 'กำลังเชื่อมต่อข้อมูลส่วนกลาง…';
  document.body.append(status);

  const setStatus = (text, ok = false) => {
    status.textContent = text;
    status.style.color = ok ? '#176b50' : '#8a6112';
    status.style.borderColor = ok ? '#8fc4ae' : '#e0c16b';
  };

  if (!window.firebase) {
    setStatus('โหลด Firebase ไม่สำเร็จ');
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const claimsRef = database.ref('claims');
    const localPersist = persist;
    const keyById = new Map();
    let baseline = new Map();
    let applyingRemote = false;
    let cloudReady = false;
    let saveQueue = Promise.resolve();

    const clean = value => JSON.parse(JSON.stringify(value));
    const signature = value => JSON.stringify(value);

    function safeLocalPersist() {
      try {
        localPersist();
        return true;
      } catch (error) {
        console.warn('Browser cache is full; Firebase saving will continue.', error);
        return false;
      }
    }

    function recordsFromSnapshot(snapshot) {
      const rows = [];
      keyById.clear();
      snapshot.forEach(child => {
        const value = child.val();
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const record = { ...value };
        if (!record.id) record.id = `legacy-${child.key}`;
        const id = String(record.id);
        keyById.set(id, child.key);
        rows.push(record);
      });
      return rows;
    }

    function applySnapshot(snapshot) {
      applyingRemote = true;
      claims = recordsFromSnapshot(snapshot);
      baseline = new Map(claims.map(item => [String(item.id), signature(item)]));
      try {
        try { localStorage.setItem(STORAGE, JSON.stringify(claims)); }
        catch (error) { console.warn('Browser cache is full; cloud data remains available.', error); }
        render();
      } finally {
        applyingRemote = false;
      }
    }

    function saveChanges(nextClaims) {
      const current = new Map(nextClaims.map(item => [String(item.id), item]));
      const operations = [];

      current.forEach((item, id) => {
        if (baseline.get(id) === signature(item)) return;
        const existingKey = keyById.get(id);
        const ref = existingKey ? claimsRef.child(existingKey) : claimsRef.push();
        if (!existingKey) keyById.set(id, ref.key);
        operations.push(ref.set(clean(item)));
      });

      baseline.forEach((_, id) => {
        if (current.has(id)) return;
        const existingKey = keyById.get(id);
        if (existingKey) operations.push(claimsRef.child(existingKey).remove());
      });

      if (!operations.length) return Promise.resolve();
      setStatus('กำลังบันทึกข้อมูลส่วนกลาง…');
      return Promise.all(operations).then(() => {
        baseline = new Map(nextClaims.map(item => [String(item.id), signature(item)]));
        setStatus('บันทึกข้อมูลส่วนกลางเรียบร้อย', true);
      });
    }

    persist = function () {
      safeLocalPersist();
      if (!cloudReady || applyingRemote) return;
      const snapshot = clean(claims);
      saveQueue = saveQueue
        .then(() => saveChanges(snapshot))
        .catch(error => {
          console.error(error);
          setStatus('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
          alert(`บันทึกข้อมูลส่วนกลางไม่สำเร็จ\n${error?.message || 'กรุณาตรวจสอบอินเทอร์เน็ตและ Firebase Rules'}`);
        });
    };

    claimsRef.on('value', snapshot => {
      applySnapshot(snapshot);
      cloudReady = true;
      setStatus('ข้อมูลส่วนกลางล่าสุด', true);
    }, error => {
      console.error(error);
      setStatus('ไม่มีสิทธิ์อ่านข้อมูลส่วนกลาง');
    });

    database.ref('.info/connected').on('value', snapshot => {
      if (!snapshot.val()) setStatus('ออฟไลน์ — รอเชื่อมต่ออินเทอร์เน็ต');
      else if (cloudReady) setStatus('ออนไลน์ — ข้อมูลใช้ร่วมกัน', true);
    });
  } catch (error) {
    console.error(error);
    setStatus('ตั้งค่า Firebase ไม่สำเร็จ');
  }
})();
