export const textCapitalize = (str) => {
    if (!str) return str;
  
    return str
      .split('-')                               
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize each word
      .join(' ');                               // Join them back with spaces
  }

export const getFuturedate = (days = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export const formatPrice = (price)=> {
    const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(price);
    return formattedPrice;
}