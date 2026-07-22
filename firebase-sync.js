/* Shared realtime data for Claim Log. */
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
  const setStatus = (text, ok=false) => {
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
    let applyingRemote = false;
    let cloudReady = false;
    let saveTimer;

    const localPersist = persist;
    persist = function () {
      localPersist();
      if (!cloudReady || applyingRemote) return;
      clearTimeout(saveTimer);
      setStatus('กำลังบันทึกขึ้นส่วนกลาง…');
      saveTimer = setTimeout(() => {
        claimsRef.set(JSON.parse(JSON.stringify(claims)))
          .then(() => setStatus('ข้อมูลส่วนกลางอัปเดตแล้ว', true))
          .catch(error => {
            console.error(error);
            setStatus('บันทึกส่วนกลางไม่สำเร็จ');
            alert('ไม่สามารถบันทึกข้อมูลส่วนกลางได้ กรุณาตรวจ Firebase Rules และอินเทอร์เน็ต');
          });
      }, 250);
    };

    claimsRef.once('value').then(snapshot => {
      if (snapshot.exists()) {
        const value = snapshot.val();
        applyingRemote = true;
        claims = Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {});
        localStorage.setItem(STORAGE, JSON.stringify(claims));
        render();
        applyingRemote = false;
      } else if (claims.length) {
        return claimsRef.set(JSON.parse(JSON.stringify(claims)));
      }
    }).then(() => {
      cloudReady = true;
      setStatus('เชื่อมต่อข้อมูลส่วนกลางแล้ว', true);
      claimsRef.on('value', snapshot => {
        if (!snapshot.exists()) return;
        const value = snapshot.val();
        applyingRemote = true;
        claims = Array.isArray(value) ? value.filter(Boolean) : Object.values(value || {});
        localStorage.setItem(STORAGE, JSON.stringify(claims));
        render();
        applyingRemote = false;
        setStatus('ข้อมูลส่วนกลางล่าสุด', true);
      }, error => {
        console.error(error);
        setStatus('ไม่มีสิทธิ์อ่านข้อมูลส่วนกลาง');
      });
    }).catch(error => {
      console.error(error);
      setStatus('เชื่อมต่อ Firebase ไม่สำเร็จ');
      alert('เชื่อมต่อ Firebase ไม่สำเร็จ กรุณาตรวจ Realtime Database Rules');
    });

    database.ref('.info/connected').on('value', snapshot => {
      if (!snapshot.val()) setStatus('ออฟไลน์ — ใช้ข้อมูลในเครื่อง');
      else if (cloudReady) setStatus('ออนไลน์ — ข้อมูลใช้ร่วมกัน', true);
    });
  } catch (error) {
    console.error(error);
    setStatus('ตั้งค่า Firebase ไม่สำเร็จ');
  }
})();
