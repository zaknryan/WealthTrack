function filterRates(currentMortgage, maturityDate, marketRates) {

const currentRate = currentMortgage.requestedRate;
  
// Process and filter marketRates
marketRates = marketRates.map(rate => {
  const match = rate.Term.match(/^(\d+) YR( VRM)?$/);
  if (match) {
    rate.termYears = parseInt(match[1]);
    rate.type = match[2] ? "Variable" : "Fixed";
  }
  rate.Rate = parseFloat(rate.Rate);
  rate.Lender = rate.Lender.replace(/\n/g, '');
  return rate;
}).filter(rate => rate.termYears !== undefined && !isNaN(rate.Rate) && rate.Rate < currentRate);

  // Filter out rates that are closest to year_to_maturity 
  return marketRates;
}

// Parse and call the function
const marketRates = JSON.parse('[' + p3 + ']');
const currentMortgage = JSON.parse(p1);
const maturityDate = p2;

return JSON.stringify(filterRates(currentMortgage, maturityDate,marketRates));
