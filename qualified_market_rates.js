function filterRates(currentMortgage, marketRates, currentPrimeRate) {

  let currentRate;  // Declare currentRate here

  if (currentMortgage.interestTypeDd === "Fixed") {
    currentRate = currentMortgage.requestedRate;
  } else {
    currentRate = currentPrimeRate - currentMortgage.rate.discount + currentMortgage.rate.premium;
  }
  
  const maturityDate = currentMortgage.maturityDate;
    
  // Process and filter marketRates
  marketRates = marketRates.map(rate => {
    const match = rate.Term.match(/^(\d+) YR( VRM)?$/);
    if (match) {
      rate.termYears = parseInt(match[1]);
      rate.type = match[2] ? "Variable" : "Fixed";
    }
    rate.Rate = parseFloat(rate.Rate);
    rate.Lender = rate.Lender.replace(/\n/g, ' ');
    return rate;
  }).filter(rate => rate.termYears !== undefined && !isNaN(rate.Rate) && rate.Rate < currentRate);
  
    // Filter out rates that are closest to year_to_maturity 
    return marketRates;
}
  
// Parse and call the function
const marketRates = JSON.parse('[' + p3 + ']');
const currentMortgage = JSON.parse(p1);
const currentPrimeRate = p2;

return JSON.stringify(filterRates(currentMortgage, marketRates, currentPrimeRate));
