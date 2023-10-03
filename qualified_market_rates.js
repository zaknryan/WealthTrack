function filterRates(currentMortgage, maturityDate, marketRates) {
  // If interest type is not 'Fixed', return null
  if (currentMortgage.interestTypeDd !== 'Fixed') {
    return null;
  }

  const currentRate = currentMortgage.requestedRate;
  
  // Process and filter marketRates
  marketRates = marketRates.map(rate => {
    const match = rate.Term.match(/^(\d+) YR$/);
    rate.termYears = match ? parseInt(match[1]) : null;
    rate.Rate = parseFloat(rate.Rate);
    return rate;
  }).filter(rate => rate.termYears !== null && !isNaN(rate.Rate) && rate.Rate < currentRate);

  // Filter out rates that are closest to year_to_maturity 
  return marketRates;
}

// Parse and call the function
const marketRates = JSON.parse('[' + p3 + ']');
const currentMortgage = JSON.parse(p1);
const maturityDate = p2;

return JSON.stringify(filterRates(currentMortgage, maturityDate,marketRates));
