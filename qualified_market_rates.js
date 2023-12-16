// Function to calculate the current mortgage rate
function calculateCurrentRate(mortgage, primeRate) {
  if (mortgage.interestTypeDd === "Fixed") {
      // For fixed rate, use the requested rate directly
      return mortgage.requestedRate;
  }
  // For variable rate, calculate using prime rate, discount, and premium
  const discount = mortgage.rateDiscount || 0;
  const premium = mortgage.ratePremium || 0;
  return primeRate - discount + premium;
}

// Function to process and standardize each rate object
function processRate(rate) {
  // Check if rate.Term is a string before calling match to avoid TypeError
  if (typeof rate.Term === 'string') {
      // Use regex to match the Term format (e.g., "5 YR" or "5 YR VRM")
      const termMatch = rate.Term.match(/^(\d+) YR( VRM)?$/);
      if (termMatch) {
          // If matched, assign termYears and type based on the regex groups
          rate.termYears = parseInt(termMatch[1]);
          rate.type = termMatch[2] ? "Variable" : "Fixed";
      }
  } else if (rate._TermMonths && rate.TermType) {
      // Handle the case where Term is defined in months (_TermMonths)
      // and the term type is specified in TermType
      rate.termYears = rate._TermMonths / 12;
      rate.type = rate.TermType;
  }

  // Convert the Rate to a float for consistent data type
  rate.Rate = parseFloat(rate.Rate);
  // Clean up the Lender string by replacing newline characters
  rate.Lender = rate.Lender.replace(/\n/g, ' ');
  return rate;
}

// Main function to filter market rates based on current mortgage data
function filterRates(currentMortgage, marketRates, currentPrimeRate) {
  // Calculate the current rate based on mortgage details
  const currentRate = calculateCurrentRate(currentMortgage, currentPrimeRate);
  // Process each rate in market rates and then filter
  const processedRates = marketRates.map(processRate);
  return processedRates.filter(rate => 
      // Filter criteria: defined term years, rate not NaN, and less than current rate
      rate.termYears !== undefined && !isNaN(rate.Rate) && rate.Rate < currentRate
  );
}

// Parse inputs and call the function
const marketRates = JSON.parse('[' + p3 + ']');
const currentMortgage = JSON.parse(p1);
const currentPrimeRate = p2;

// Return the filtered rates as a JSON string
return JSON.stringify(filterRates(currentMortgage, marketRates, currentPrimeRate));