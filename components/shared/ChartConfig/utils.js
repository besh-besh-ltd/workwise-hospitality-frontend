const Utils = {
  months({ count }) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months.slice(0, count);
  },
  weeks({ count }) {
    const weeks = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return count ? weeks.slice(0, count) : weeks;
  },
  days({ month, year }) {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  },
  dateRange({ rangeType, today = new Date() }) {
    const result = [];
    const labels = [];
    const now = new Date(today);

    switch (rangeType) {
      case 'today':
        result.push(now.toISOString().split('T')[0]);
        labels.push('Today');
        break;

      case 'past7days':
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(now.getDate() - i);
          result.push(date.toISOString().split('T')[0]);
          labels.push(date.toDateString().split(' ')[0]); 
        }
        break;

      case 'currentMonth':
        const daysInCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        for (let i = 1; i <= daysInCurrentMonth; i++) {
          result.push(new Date(now.getFullYear(), now.getMonth(), i).toISOString().split('T')[0]);
          labels.push(i);
        }
        break;

      case 'past3months':
      case 'past6months':
        const monthsToShow = rangeType === 'past3months' ? 3 : 6;
        for (let i = 0; i < monthsToShow; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          result.push(date.toISOString().split('T')[0]);
          labels.push(`${Utils.months({ count: 12 })[date.getMonth()]} ${date.getFullYear()}`);
        }
        labels.reverse();
        break;

      case 'wholeYear':
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          result.push(date.toISOString().split('T')[0]);
          labels.push(Utils.months({ count: 12 })[i]);
        }
        break;

      default:
        break;
    }

    return { result, labels };
  },
  numbers({ count, min, max }) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
  },
  CHART_COLORS: {
    red: 'rgba(255, 99, 132, 1)',
    blue: 'rgba(54, 162, 235, 1)',
    green: 'rgba(75, 192, 192, 1)',
    yellow: 'rgba(255, 206, 86, 1)',
    purple: 'rgba(153, 102, 255, 1)',
  },
  transparentize(color, opacity) {
    const alpha = 1 - opacity;
    return color.replace('1)', `${alpha})`);
  },
};

export default Utils;
