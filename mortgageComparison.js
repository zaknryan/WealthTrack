function mortgageComparison(mortgage, marketRates, marketRateLender = 0.03) {

    //const currentPeriodsRemaining = mortgage.actualPaymentTerm - (mortgage.amortizationTerm - mortgage.effectiveAmortization);
    //const amortPeriodsRemaining = mortgage.effectiveAmortization;
    let firstPaymentDate = new Date(mortgage.firstPaymentDate);
    let maturityDate = new Date(mortgage.maturityDate);

    // Calculate startDate
    let startDate = new Date(firstPaymentDate);
    startDate.setMonth(startDate.getMonth() - 1); // Set month one month prior

    // Calculate periodsRemaining
    let today = new Date();
    let currentPeriodsRemaining = monthDiff(today, maturityDate);

    // Calculate amortPeriodsRemaining
    let amortPeriodsRemaining = mortgage.amortizationTerm - monthDiff(startDate, today);
    // Ensure amortPeriodsRemaining is not negative
    amortPeriodsRemaining = amortPeriodsRemaining <= 0 ? 0 : amortPeriodsRemaining;

    const currentMortgage = loanPaymentDetails(
        mortgage.balanceRemaining,
        mortgage.requestedRate / 100,
        amortPeriodsRemaining,
        currentPeriodsRemaining
    );

    const breakFees = calculateBreakFees(
        mortgage.balanceRemaining,
        currentPeriodsRemaining,
        marketRates, // <-- Change here
        marketRateLender
    );

    //Run through each of the market rates and calculate the mortgage details
    const marketMortgages = marketRates.map(rateObj => {
        const marketLoanDetails = loanPaymentDetails(
            mortgage.balanceRemaining,
            rateObj.Rate/100,
            amortPeriodsRemaining,
            Math.min(rateObj.termYears * 12, currentPeriodsRemaining),
        );

        let ix = marketLoanDetails.cumulative.InterestPayments.length - 1;
    
        return {
            ...rateObj, 
            ...marketLoanDetails,
            interestSavings: currentMortgage.cumulative.InterestPayments[ix] - marketLoanDetails.cumulative.InterestPayments[ix],           //Interest savings from moving to this mortgage
            principalPaymentInc: marketLoanDetails.cumulative.PrincipalPayments[ix] - currentMortgage.cumulative.PrincipalPayments[ix],     //Incremental monthly principal payment
            principalDiff: marketLoanDetails.cumulative.endingPrincipal[ix] - currentMortgage.cumulative.endingPrincipal[ix],                         //Difference in remaining principal at the end of the current mortgage
            paymentDelta: marketLoanDetails.monthlyPayment - currentMortgage.monthlyPayment                             //Change in monthly payment (+ive means paying more)
        };
    });

    //Find which mortgage has the lowest totalPayments
    lowest = getIndexesOfMinValues(marketMortgages, ['totalPayments','totalInterestPayments','endingPrincipal','monthlyPayment'])

    const output = {
        currentMortgage: currentMortgage,
        marketMortgages: marketMortgages,
        lowest: lowest,
        breakfees: Math.round(breakFees * 100) / 100,
    };

    return JSON.stringify(output);
}

function loanPaymentDetails(principal, annualInterestRate, amortPeriods, periods) {
    //amortPeriods - the number of periods overwhich this remaining balance will be amortized
    //periods - the number of periods in the mortage deal (ie 5 years with a 25 year amortization)
    const monthlyInterestRate = periodInterestRate(annualInterestRate, 12);

    const monthlyPayment = Math.round(principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, amortPeriods)) / (Math.pow(1 + monthlyInterestRate, amortPeriods) - 1)*100)/100;
    
    const today = new Date(); // Today's date
    
    const termEndDate = new Date(today); // Copy today's date to termEndDate
    termEndDate.setMonth(today.getMonth() + periods); // Add X months to termEndDate
    
    const amortEndDate = new Date(today); // Copy today's date to amortEndDate
    amortEndDate.setMonth(today.getMonth() + amortPeriods); // Add Y months to amortEndDate

    let cumulativePayments = [];
    let cumulativePrincipalPayments = [];
    let cumulativeInterestPayments = [];
    let remainingBalances = []; // Array to keep track of the remaining balance at each iteration
    let remainingBalance = principal;
    
    let cumulativeTotalPayments = 0;
    let cumulativeTotalPrincipalPayments = 0;
    let cumulativeTotalInterestPayments = 0;
    
    for (let i = 0; i < periods; i++) {
        let interestPayment = remainingBalance * monthlyInterestRate;
        let principalPayment = monthlyPayment - interestPayment;
    
        remainingBalance -= principalPayment;
    
        cumulativeTotalPayments += monthlyPayment;
        cumulativeTotalPrincipalPayments += principalPayment;
        cumulativeTotalInterestPayments += interestPayment;
    
        // Pushing cumulative sums into the arrays at each iteration
        cumulativePayments.push(cumulativeTotalPayments);
        cumulativePrincipalPayments.push(cumulativeTotalPrincipalPayments);
        cumulativeInterestPayments.push(cumulativeTotalInterestPayments);
        remainingBalances.push(remainingBalance); // Recording the remaining balance at each iteration
    }

    cumulativePayments = cumulativePayments.map(amount => Math.round(amount * 100) / 100);
    cumulativePrincipalPayments = cumulativePrincipalPayments.map(amount => Math.round(amount * 100) / 100);
    cumulativeInterestPayments = cumulativeInterestPayments.map(amount => Math.round(amount * 100) / 100);
    remainingBalances = remainingBalances.map(amount => Math.round(amount * 100) / 100);

    return {
        totalPayments: cumulativePayments[cumulativePayments.length - 1],
        totalPrincipalPayments: cumulativePrincipalPayments[cumulativePrincipalPayments.length - 1],
        totalInterestPayments: cumulativeInterestPayments[cumulativeInterestPayments.length - 1],
        endingPrincipal: remainingBalances[remainingBalances.length - 1],
        monthlyPayment: monthlyPayment,
        interestRate: annualInterestRate,
        termEndDate: termEndDate.toISOString(),
        amortEndDate: amortEndDate.toISOString(),
        cumulative: {
            Payments: cumulativePayments,
            PrincipalPayments: cumulativePrincipalPayments,
            InterestPayments: cumulativeInterestPayments,
            endingPrincipal: remainingBalances
        }
    };
}

function periodInterestRate(annRate, periodsPerYear, compoundingPeriodsPerYear = 2) {
    //Calculate effective annual interest rate
    const effectiveAnnRate = Math.pow(1 + annRate / compoundingPeriodsPerYear, compoundingPeriodsPerYear)-1;

    return Math.pow(1 + effectiveAnnRate, 1 / periodsPerYear) - 1;
}

function calculateBreakFees(remainingPrinciple, remainingPeriods, mortgageRate, currentRate) {
    const IRD = mortgageRate - currentRate;
    const IRDPeriod = remainingPrinciple * (IRD / 12);

    const IRDOwing = IRDPeriod * remainingPeriods;

    const breakFees = Math.max(IRDOwing, 3 * mortgageRate / 12 * remainingPrinciple);

    return breakFees;
}

function getIndexesOfMinValues(arr, props) {
    const indexes = {};
    props.forEach(prop => {
      const minValueObj = arr.reduce((prev, current) => {
        return (prev[prop] < current[prop]) ? prev : current;
      });
      indexes[prop] = arr.indexOf(minValueObj);
    });
    return indexes;
  }

// Function to calculate months difference between two dates
function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
  }

mortgageDetails = JSON.parse(p1);
marketRates = JSON.parse(p2);
marketRateLender = p3/100;

return JSON.stringify(mortgageComparison(mortgageDetails, marketRates, marketRateLender)).slice(1, -1).replace(/\\/g, "");
