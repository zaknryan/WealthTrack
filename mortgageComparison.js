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

// ... (rest of the code remains unchanged)

mortgageDetails = p1;
marketRates = p2;
marketRateLender = p3/100;

return JSON.stringify(mortgageComparison(mortgageDetails, marketRates, marketRateLender)).slice(1, -1).replace(/\\/g, "");
