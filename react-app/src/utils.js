export function numberToWords(num) {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (!num) return '';
    num = num.toString();
    if (num.length > 9) return 'overflow';

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';

    return str.trim();
}

export const evaluateFormula = (input) => {
    if (!input) return 0;
    let str = input.toString().trim();
    if (str.startsWith('=')) {
        try {
            // Extract expression after = and handle %
            // VERY BASIC eval replacement or just usage of Function
            // In a real app, use a math parser library. Here, duplicating logic.
            let expression = str.substring(1).replace(/%/g, '/100');
            // Security: sanitization (only allow digits and operators)
            if (/^[0-9+\-*/().\s]*$/.test(expression)) {
                // eslint-disable-next-line no-new-func
                return new Function('return ' + expression)();
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }
    return parseFloat(str) || 0;
};
