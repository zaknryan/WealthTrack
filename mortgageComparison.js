function mortgageComparison(p1, marketRates, marketRateLender = 0.03) {
    
    const mortgage = JSON.parse(p1);

    const periodsRemaining = mortgage.actualPaymentTerm - (mortgage.amortizationTerm - mortgage.effectiveAmortization);
    const amortPeriodsRemaining = mortgage.effectiveAmortization;

    const currentMortgage = loanPaymentDetails(
        mortgage.balanceRemaining,
        mortgage.requestedRate / 100,
        amortPeriodsRemaining,
        periodsRemaining
    );

    const breakFees = calculateBreakFees(
        mortgage.balanceRemaining,
        periodsRemaining,
        marketRates, // <-- Change here
        marketRateLender
    );

    //Run through each of the market rates and calculate the mortgage details
    const marketMortgages = marketRates.map(rateObj => {
        const marketLoanDetails = loanPaymentDetails(
            mortgage.balanceRemaining,
            rateObj.Rate/100,
            amortPeriodsRemaining,
            mortgage.actualPaymentTerm - (mortgage.amortizationTerm - mortgage.effectiveAmortization)
        );
    
        return {
            ...rateObj, 
            ...marketLoanDetails,
            interestSavings: currentMortgage.totalInterestPayments - marketLoanDetails.totalInterestPayments,           //Interest savings from moving to this mortgage
            principalPaymentInc: marketLoanDetails.totalPrincipalPayments - currentMortgage.totalPrincipalPayments,     //Incremental monthly principal payment
            principalDiff: marketLoanDetails.endingPrincipal - currentMortgage.endingPrincipal,                         //Difference in remaining principal at the end of the current mortgage
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
    const monthlyInterestRate = periodInterestRate(annualInterestRate, 12);

    const monthlyPayment = Math.round(principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, amortPeriods)) / (Math.pow(1 + monthlyInterestRate, amortPeriods) - 1)*100)/100;

    let totalPayments = 0;
    let totalPrincipalPayments = 0;
    let totalInterestPayments = 0;
    let remainingBalance = principal;

    for (let i = 0; i < periods; i++) {
        const interestPayment = remainingBalance * monthlyInterestRate;
        const principalPayment = monthlyPayment - interestPayment;

        remainingBalance -= principalPayment;

        totalPayments += monthlyPayment;
        totalPrincipalPayments += principalPayment;
        totalInterestPayments += interestPayment;
    }

    return {
        totalPayments: Math.round(totalPayments * 100) / 100,
        totalPrincipalPayments: Math.round(totalPrincipalPayments * 100) / 100,
        totalInterestPayments: Math.round(totalInterestPayments * 100) / 100,
        endingPrincipal: Math.round(remainingBalance * 100) / 100,
        monthlyPayment: monthlyPayment,
        interestRate: annualInterestRate
    };
}

function periodInterestRate(annRate, periodsPerYear, compoundingPeriodsPerYear = 2) {
    return Math.pow(1 + annRate / compoundingPeriodsPerYear, compoundingPeriodsPerYear / periodsPerYear) - 1;
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

mortgageDetails = p1;
marketRates = JSON.parse(p2);
marketRateLender = p3/100;

return JSON.stringify(mortgageComparison(mortgageDetails, marketRates, marketRateLender)).slice(1, -1).replace(/\\/g, "");
