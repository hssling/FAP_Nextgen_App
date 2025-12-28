// Clear Analytics Cache Script
// Run this in browser console to clear cached analytics data

console.log('Clearing analytics cache...');
sessionStorage.removeItem('analytics_' + JSON.parse(localStorage.getItem('sb-bcripmhepdufpvfkqlil-auth-token'))?.user?.id);
console.log('Cache cleared! Please refresh the page.');
