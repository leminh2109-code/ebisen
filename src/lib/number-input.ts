// Định dạng ô nhập số tiền: hiển thị "70.000" trong khi gõ "70000".
// Server (entry/actions.ts) đã tự bỏ dấu chấm khi parse nên giá trị submit vẫn hợp lệ.

/** "70000" -> "70.000". Bỏ mọi ký tự không phải chữ số rồi nhóm 3 chữ số. */
export function groupDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Định dạng lại giá trị input tại chỗ, giữ nguyên vị trí con trỏ theo số chữ số
 * đứng trước con trỏ (tránh nhảy về cuối khi thêm/bớt dấu chấm).
 */
export function formatMoneyInput(el: HTMLInputElement): void {
  const oldValue = el.value;
  const caret = el.selectionStart ?? oldValue.length;
  const digitsBeforeCaret = oldValue.slice(0, caret).replace(/\D/g, '').length;

  const grouped = groupDigits(oldValue);
  el.value = grouped;

  let pos = 0;
  let seen = 0;
  while (pos < grouped.length && seen < digitsBeforeCaret) {
    if (/\d/.test(grouped[pos])) seen++;
    pos++;
  }
  el.setSelectionRange(pos, pos);
}
