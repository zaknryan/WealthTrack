function filterRates(interestType, maturityDate, marketRates) {
    // If interest type is not 'Fixed', return null
    if (interestType !== 'Fixed') {
      return null;
    }
  
    // Calculate the year to maturity
    const currentDate = new Date();
    const targetDate = new Date(maturityDate);
    const yearDifference = targetDate.getFullYear() - currentDate.getFullYear();
    const year_to_maturity = Math.round(yearDifference + (targetDate - new Date(currentDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())) / (365.25 * 24 * 60 * 60 * 1000));
  
    // Extract term years from the Term property
    marketRates.forEach(rate => {
      const match = rate.Term.match(/^(\d+) YR$/);
      rate.termYears = match ? parseInt(match[1]) : null;
    });

    //Convert Rate to a float
    marketRates.forEach(rate => {
        rateObj.Rate = parseFloat(rate.Rate);
    });
  
    // Filter out rates that are closest to year_to_maturity
    return marketRates.filter(rate => rate.termYears === year_to_maturity);
  }

const marketRates = JSON.parse('[' + p3 + ']');
const interestType = p1;
const maturityDate = p2;

return JSON.stringify(filterRates(p1,p2,marketRates))