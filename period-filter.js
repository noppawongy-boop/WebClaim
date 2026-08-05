/* Weekly/monthly filtering for summaries, channel counters, and saved claims. */
(() => {
  const bar = document.querySelector('#periodBar');
  const picker = document.querySelector('#periodPicker');
  const caption = document.querySelector('#periodCaption');
  if (!bar || !picker || !caption) return;

  let mode = 'all';
  const pad = n => String(n).padStart(2, '0');
  const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const thaiDate = value => {
    const [year, month, day] = String(value).split('-').map(Number);
    return day && month && year ? `${day} ${monthNames[month - 1]} ${year + 543}` : value;
  };
  const isoWeekValue = date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const firstWeek = new Date(d.getFullYear(), 0, 4);
    const week = 1 + Math.round(((d - firstWeek) / 86400000 - 3 + ((firstWeek.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${pad(week)}`;
  };
  const claimDate = item => String(item.contactDate || item.purchaseDate || item.createdAt || '').slice(0, 10);
  const weekRange = value => {
    const match = String(value).match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    const jan4 = new Date(+match[1], 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (+match[2] - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [localDate(monday), localDate(sunday)];
  };
  const matches = item => {
    if (mode === 'all') return true;
    const date = claimDate(item);
    if (!date) return false;
    if (mode === 'month') return date.startsWith(picker.value);
    const range = weekRange(picker.value);
    return Boolean(range && date >= range[0] && date <= range[1]);
  };

  const originalRender = render;
  render = function () {
    const complete = claims;
    claims = complete.filter(matches);
    try { originalRender(); }
    finally { claims = complete; }
    updateCaption();
  };

  function updateCaption() {
    const visible = document.querySelector('#totalCount')?.textContent || '0';
    if (mode === 'all') {
      caption.textContent = `แสดงข้อมูลทั้งหมด ${visible} รายการ`;
      return;
    }
    if (mode === 'month') {
      const [year, month] = picker.value.split('-').map(Number);
      caption.textContent = month && year
        ? `เดือน${monthNames[month - 1]} ${year + 543} · พบ ${visible} รายการ`
        : 'กรุณาเลือกเดือนที่ต้องการดู';
      return;
    }
    const range = weekRange(picker.value);
    caption.textContent = range
      ? `${thaiDate(range[0])} – ${thaiDate(range[1])} · พบ ${visible} รายการ`
      : 'กรุณาเลือกสัปดาห์ที่ต้องการดู';
  }

  function setMode(next) {
    mode = next;
    bar.querySelectorAll('[data-period]').forEach(button => {
      const active = button.dataset.period === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    picker.classList.toggle('hidden', mode === 'all');
    if (mode === 'month') {
      picker.type = 'month';
      picker.value = localDate(new Date()).slice(0, 7);
      picker.setAttribute('aria-label', 'เลือกเดือน');
    } else if (mode === 'week') {
      picker.type = 'week';
      picker.value = isoWeekValue(new Date());
      picker.setAttribute('aria-label', 'เลือกสัปดาห์');
    }
    render();
  }

  bar.addEventListener('click', event => {
    const button = event.target.closest('[data-period]');
    if (button) setMode(button.dataset.period);
  });
  picker.addEventListener('change', render);
  bar.querySelector('[data-period="all"]')?.setAttribute('aria-pressed', 'true');
  updateCaption();
})();
