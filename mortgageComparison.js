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
        const loanDetails = loanPaymentDetails(
            mortgage.balanceRemaining + breakFees,
            parseFloat(rateObj.Rate),
            amortPeriodsRemaining,
            mortgage.actualPaymentTerm - (mortgage.amortizationTerm - mortgage.effectiveAmortization)
        );
    
        return {
            ...rateObj, 
            ...loanDetails
        };
    });

    //Find which mortgage has the lowest totalPayments
    const lowestTotalPayments = marketMortgages.reduce((prev, current) => {
        return (prev.totalPayments < current.totalPayments) ? prev : current;
    });

    const output = {
        currentMortgage: currentMortgage,
        marketMortgages: marketMortgages,
        lowestTotalPayments: lowestTotalPayments,
        interestSavings: currentMortgage.totalInterestPayments - marketMortgages.totalInterestPayments,
        principalPaymentInc: marketMortgages.totalPrincipalPayments - currentMortgage.totalPrincipalPayments,
        principalDiff: marketMortgages.endingPrincipal - currentMortgage.endingPrincipal,
        breakfees: Math.round(breakFees * 100) / 100,
        paymentDelta: marketMortgages.monthlyPayment - currentMortgage.monthlyPayment
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

mortgageDetails = p1;
marketRates = p2;
marketRateLender = p3/100;

return JSON.stringify(mortgageComparison(mortgageDetails, marketRates, marketRateLender)).slice(1, -1).replace(/\\/g, "");
