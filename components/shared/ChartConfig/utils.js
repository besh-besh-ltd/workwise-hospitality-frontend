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
  DATE_RANGE({ rangeType, today = new Date() }) {
    const result = [];
    const labels = [];
    const now = new Date(today);

    const formatDate = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    switch (rangeType) {
      case 'today':
        result.push(formatDate(now));
        labels.push('Today');
        break;

      case 'past7days':
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(now.getDate() - i);
          result.push(formatDate(date));
          labels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
        }
        break;

      case 'currentMonth':
        const daysInCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        for (let i = 1; i <= daysInCurrentMonth; i++) {
          result.push(formatDate(new Date(now.getFullYear(), now.getMonth(), i)));
          labels.push(i);
        }
        break;

      case 'past3months':
      case 'past6months':
        const monthsToShow = rangeType === 'past3months' ? 3 : 6;
        for (let i = 0; i < monthsToShow; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          result.push(formatDate(date));
          labels.push(`${Utils.months({ count: 12 })[date.getMonth()]} ${date.getFullYear()}`);
        }
        labels.reverse();
        break;

      case 'wholeYear':
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          result.push(formatDate(date));
          labels.push(Utils.months({ count: 12 })[i]);
        }
        break;

      default:
        break;
    }

    return { result, labels };
  },
  CHART_TITLE({ labelType, today = new Date() }) {
    const year = today.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    switch (labelType) {
      case 'today':
        return `Chart Report for ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      case 'past7days': {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 6);
        return `Chart Report from ${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      case 'currentMonth':
        return `Chart Report for ${monthNames[today.getMonth()]} ${year}`;
      case 'past3months': {
        const currentMonth = today.getMonth();
        const startMonth = currentMonth - 2 >= 0 ? currentMonth - 2 : 0;
        return `Chart Report from ${monthNames[startMonth]} - ${monthNames[currentMonth]} ${year}`;
      }
      case 'past6months': {
        const currentMonth = today.getMonth();
        const startMonth = currentMonth - 5 >= 0 ? currentMonth - 5 : 0;
        return `Chart Report from ${monthNames[startMonth]} - ${monthNames[currentMonth]} ${year}`;
      }
      case 'wholeYear':
        return `Chart Report for the Year ${year}`;
      default:
        return 'Chart Report';
    }
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
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  },
  transparentize(color, opacity) {
    const alpha = 1 - opacity;
    return color.replace('1)', `${alpha})`);
  },
};

export default Utils;
