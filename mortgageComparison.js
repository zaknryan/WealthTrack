function mortgageComparison(existingMortgage, marketRates, marketPrime, marketRateLender = marketPrime) {
    // Set variables from properties in currentMortgage
    const {
        amortizationTerm,
        actualPaymentTerm: mortgageTerm,
        requestedRate: currentMortgageRate,
        interestTypeDd: interestType,
        balanceRemaining,
        netLoanAmount,
        rate: {
            discount: rateDiscount = 0,   // Default value for discount is 0
            premium: ratePremium = 0      // Default value for premium is 0
        },
        ltv,
        combinedIncome,
        qualifyingGds,
        qualifyingTds,
        PAndIPaymentAmountMonthly: currentPayment
    } = existingMortgage

    // Set calculated variables based on currentMortgage
    let firstPaymentDate = new Date(existingMortgage.firstPaymentDate);
    let maturityDate = new Date(existingMortgage.maturityDate);

    // Calculate startDate
    let startDate = new Date(firstPaymentDate);
    startDate.setMonth(startDate.getMonth() - 1); // Set month one month prior

    // Calculate periodsRemaining
    //let today = new Date();
    //let currentPeriodsRemaining = monthDiff(today, maturityDate);

    // Estimate propTax_Heat = propTax + Heating = HouseExp - Mortgage from GSD and TSD
    const houseExpenses = qualifyingGds * (combinedIncome);
    const propTax_Heat = houseExpenses - currentPayment*12;

    const otherExp = (combinedIncome) * (qualifyingTds - qualifyingGds);

    // Calculate amortPeriodsRemaining
    let today = new Date();
    let periodsPast = monthDiff(startDate, today);
    // Ensure amortPeriodsRemaining is not negative
    //amortPeriodsRemaining = amortPeriodsRemaining <= 0 ? 0 : amortPeriodsRemaining;

    // Calculate the current rate used to determine payments
    let currentRate = interestType == 'Fixed' ? currentMortgageRate : marketPrime - rateDiscount + ratePremium;

    // Calculate propertyValue based on ltv and original loan amount
    let propertyValue = netLoanAmount / ltv;

    // Get loan payment details for current Mortgage
    const currentMortgage = mortgageDetails(
        netLoanAmount,
        currentRate / 100,
        amortizationTerm,
        mortgageTerm,
        periodsPast,
        propertyValue,
        combinedIncome,
        propTax_Heat,
        otherExp
    );
    currentMortgage.type = interestType;

    const estBreakFees = calculateBreakFees(
        balanceRemaining,
        mortgageTerm - periodsPast,
        currentRate / 100, // <-- Corrected rate variable
        marketRateLender / 100
    );

    //Run through each of the market rates and calculate the mortgage details
    const marketMortgages = marketRates.map(rateObj => {
        const marketLoanDetails = mortgageDetails(
            currentMortgage.principalBalance,
            rateObj.Rate / 100,
            amortizationTerm - periodsPast,
            rateObj.termYears * 12,
            0,
            propertyValue,        
            combinedIncome,
            propTax_Heat,
            otherExp
        );

        let ix = Math.min(marketLoanDetails.cumulative.InterestPayments.length, currentMortgage.cumulative.InterestPayments.length) - 1;

        // Evaluate GDS, TDS and LTV ratios
        // ratioLimits are given in whole numbers ie 80, rather than 0.8
        marketLoanDetails.ratios.gdsQualified = marketLoanDetails.ratios.gds < rateObj.ratioLimits.gds/100;
        marketLoanDetails.ratios.tdsQualified = marketLoanDetails.ratios.tds < rateObj.ratioLimits.tds/100;
        marketLoanDetails.ratios.ltvQualified = marketLoanDetails.ratios.ltv < rateObj.ratioLimits.ltv/100;
        // Evaluate if a user qualifies under ALL ratios
        marketLoanDetails.ratios.qualified = marketLoanDetails.ratios.gdsQualified && marketLoanDetails.ratios.tdsQualified && marketLoanDetails.ratios.ltvQualified;


        const interestSavings = currentMortgage.cumulative.InterestPayments[ix] - marketLoanDetails.cumulative.InterestPayments[ix];           //Interest savings from moving to this mortgage
        const principalPaymentInc = marketLoanDetails.cumulative.PrincipalPayments[ix] - currentMortgage.cumulative.PrincipalPayments[ix];     //Incremental monthly principal payment
        const principalDiff = marketLoanDetails.cumulative.endingPrincipal[ix] - currentMortgage.cumulative.endingPrincipal[ix];                         //Difference in remaining principal at the end of the current mortgage

        //delete the cumulative portion of the JSON output to save space
        delete marketLoanDetails['cumulative']
    
        return {
            ...rateObj,
            ...marketLoanDetails,
            //remaining: {remainingYears: marketLoanDetails.termYears, 
            //                remainingPeriods: marketLoanDetails.termYears * 12},
            interestSavings: interestSavings,           //Interest savings from moving to this mortgage
            principalPaymentInc: principalPaymentInc,     //Incremental monthly principal payment
            principalDiff: principalDiff,                         //Difference in remaining principal at the end of the current mortgage
            paymentDelta: marketLoanDetails.monthlyPayment - currentMortgage.monthlyPayment,                             //Change in monthly payment (+ive means paying more)
            compare_periods: ix + 1,
        };
    });

    //Find which mortgage has the lowest totalPayments
    lowest = getIndexesOfMinValues(marketMortgages, ['totalPayments', 'totalInterestPayments', 'endingPrincipal', 'monthlyPayment'])

    //delete the cumulative portion of the JSON output to save space
    delete currentMortgage['cumulative'];

    const output = {
        currentMortgage: currentMortgage,
        marketMortgages: marketMortgages,
        lowest: lowest,
        estBreakFees: Math.round(estBreakFees * 100) / 100,
    };

    return JSON.stringify(output);
}

function mortgageDetails(principal, annualInterestRate, amortizationTerm, mortgageTerm, periodsPast, propertyValue, combinedIncome, propTax_Heat, otherExp) {
    //amortPeriods - the number of periods overwhich this remaining balance will be amortized
    //periods - the number of periods in the mortage deal (ie 5 years with a 25 year amortization)
    const monthlyInterestRate = periodInterestRate(annualInterestRate, 12);

    const monthlyPayment = Math.round(principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, amortizationTerm)) / (Math.pow(1 + monthlyInterestRate, amortizationTerm) - 1) * 100) / 100;

    const today = new Date(); // Today's date

    const termEndDate = new Date(today); // Copy today's date to termEndDate
    termEndDate.setMonth(today.getMonth() + mortgageTerm - periodsPast); // Add X months to termEndDate

    const amortEndDate = new Date(today); // Copy today's date to amortEndDate
    amortEndDate.setMonth(today.getMonth() + amortizationTerm - periodsPast); // Add Y months to amortEndDate

    let cumulativePayments = [];
    let cumulativePrincipalPayments = [];
    let cumulativeInterestPayments = [];
    let remainingBalances = []; // Array to keep track of the remaining balance at each iteration
    let remainingBalance = principal;

    let cumulativeTotalPayments = 0;
    let cumulativeTotalPrincipalPayments = 0;
    let cumulativeTotalInterestPayments = 0;

    for (let i = 0; i < mortgageTerm; i++) {
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

    //Calculate ratios
    principalBalance = remainingBalances[periodsPast]
    const ltv = principalBalance / propertyValue;
    const gds = (propTax_Heat + monthlyPayment*12) / combinedIncome;
    const tds = gds + (otherExp / combinedIncome);

    return {
        totalPayments: cumulativePayments[cumulativePayments.length - 1],
        totalPrincipalPayments: cumulativePrincipalPayments[cumulativePrincipalPayments.length - 1],
        totalInterestPayments: cumulativeInterestPayments[cumulativeInterestPayments.length - 1],
        endingPrincipal: remainingBalances[remainingBalances.length - 1],
        principalBalance: principalBalance,
        monthlyPayment: monthlyPayment,
        interestRate: annualInterestRate,
        ratios: {
            ltv: ltv,
            gds: gds,
            tds: tds
        },
        term: {
            endDate: termEndDate.toISOString(),
            remainingYears: Math.round((mortgageTerm - periodsPast) / 12 * 10) / 10,
            remainingPeriods: (mortgageTerm - periodsPast)
        },
        amortization: {
            endDate: amortEndDate.toISOString(),
            remainingYears: Math.round((amortizationTerm - periodsPast) / 12 * 10) / 10,
            remainingPeriods: (amortizationTerm - periodsPast)
        },
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
    const effectiveAnnRate = Math.pow(1 + annRate / compoundingPeriodsPerYear, compoundingPeriodsPerYear) - 1;

    return Math.pow(1 + effectiveAnnRate, 1 / periodsPerYear) - 1;
}

function calculateBreakFees(remainingPrinciple, remainingPeriods, mortgageRate, marketRate) {
    const IRD = (mortgageRate - marketRate);
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



try {
    existingMortgage = p1 ? JSON.parse(p1) : undefined;
    marketRates = p2 ? JSON.parse(p2) : undefined;
    marketPrime = p3 ? parseFloat(p3) : 6.5; // Assuming p3 is a number in string format.
    marketRateLender = marketPrime; // Use marketPrime as the default if p3 is defined.
} catch (error) {
    console.error("Error parsing JSON input:", error);
    // Handle the error appropriately, perhaps by returning a message or setting default values.
}

// Ensure that the required variables are defined before calling mortgageComparison
if (existingMortgage && marketRates && typeof marketPrime === 'number') {
    const comparisonResult = mortgageComparison(existingMortgage, marketRates, marketPrime, marketRateLender);
    return JSON.stringify(comparisonResult).slice(1, -1).replace(/\\/g, "");
} else {
    // Handle the case where the inputs are not defined or valid
    console.error("Invalid input for mortgage comparison.");
    // Return an error message or handle it as per your application's error handling policy
}