function mortgageComparison(p1, marketRate = 0.025, marketRateLender = 0.03) {
    
    const Mortgage = JSON.parse(p1);

    const periodsRemaining = Mortgage.actualPaymentTerm - (Mortgage.amortizationTerm - Mortgage.effectiveAmortization);
    const amortPeriodsRemaining = Mortgage.effectiveAmortization;

    const currentMortgage = loanPaymentDetails(
        Mortgage.balanceRemaining,
        Mortgage.requestedRate / 100,
        amortPeriodsRemaining,
        periodsRemaining
    );

    const breakFees = calculateBreakFees(
        Mortgage.balanceRemaining,
        periodsRemaining,
        marketRate,
        marketRateLender
    );

    const marketMortgage = loanPaymentDetails(
        Mortgage.balanceRemaining + breakFees,
        marketRate,
        amortPeriodsRemaining,
        Mortgage.actualPaymentTerm - (Mortgage.amortizationTerm - Mortgage.effectiveAmortization)
    );

    const output = {
        CurrentMortgage: currentMortgage,
        MarketMortgage: marketMortgage,
        InterestSavings: currentMortgage.TotalInterestPayments - marketMortgage.TotalInterestPayments,
        PrincipalPaymentInc: marketMortgage.TotalPrincipalPayments - currentMortgage.TotalPrincipalPayments,
        PrincipalDiff: marketMortgage.EndingPrincipal - currentMortgage.EndingPrincipal,
        Breakfees: Math.round(breakFees * 100) / 100,
        PaymentDelta: marketMortgage.MonthlyPayment - currentMortgage.MonthlyPayment
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
        TotalPayments: Math.round(totalPayments * 100) / 100,
        TotalPrincipalPayments: Math.round(totalPrincipalPayments * 100) / 100,
        TotalInterestPayments: Math.round(totalInterestPayments * 100) / 100,
        EndingPrincipal: Math.round(remainingBalance * 100) / 100,
        MonthlyPayment: monthlyPayment
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

return JSON.stringify(mortgageComparison(p1)).slice(1, -1).replace(/\\/g, "")
