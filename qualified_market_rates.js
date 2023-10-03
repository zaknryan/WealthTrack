function filterRates(currentMortgage, maturityDate, marketRates) {
    // If interest type is not 'Fixed', return null
    if (currentMortgage.interestType !== 'Fixed') {
      return null;
    }
  
    // Calculate the year to maturity
    const currentDate = new Date();
    const targetDate = new Date(maturityDate);
    const yearDifference = targetDate.getFullYear() - currentDate.getFullYear();
    const year_to_maturity = Math.round(yearDifference + (targetDate - new Date(currentDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())) / (365.25 * 24 * 60 * 60 * 1000));
    const currentRate = currentMortgage.requestedRate;
  
  // Extract term years from the Term property and convert Rate to a float, filtering out invalid Rate values
  marketRates = marketRates.map(rate => {
    const match = rate.Term.match(/^(\d+) YR$/);
    rate.termYears = match ? parseInt(match[1]) : null;
    rate.Rate = parseFloat(rate.Rate);
    return rate;
  }).filter(rate => rate.Rate && !isNaN(rate.Rate) && rate.Rate < currentRate);

    //Convert Rate to a float
    marketRates.forEach(rate => {
        rate.Rate = parseFloat(rate.Rate);
    });
  
    // Filter out rates that are closest to year_to_maturity
    return marketRates.filter(rate => rate.termYears === year_to_maturity);
  }

const marketRates = JSON.parse('[' + p3 + ']');
const currentMortgage = JSON.parse(p1);
const maturityDate = p2;

return JSON.stringify(filterRates(currentMortgage,p2,marketRates))
