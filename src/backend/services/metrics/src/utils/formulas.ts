import Big from 'big.js'; // v6.2.1
import { MetricDataType } from '../models/metric.model';

/**
 * Configuration for Big.js decimal arithmetic
 */
Big.DP = 20; // Set decimal precision
Big.RM = Big.roundHalfUp; // Use banker's rounding

/**
 * Calculates Net Dollar Retention (NDR) with precise decimal arithmetic
 * Formula: (Starting ARR + Expansions - Contractions - Churn) / Starting ARR * 100
 * 
 * @param startingARR - Beginning Annual Recurring Revenue
 * @param expansions - Revenue from customer expansions
 * @param contractions - Revenue lost from downgrades
 * @param churn - Revenue lost from cancellations
 * @returns NDR as a percentage rounded to 2 decimal places
 * @throws Error if inputs are invalid or result is out of range
 */
export function calculateNDR(
    startingARR: number,
    expansions: number,
    contractions: number,
    churn: number
): number {
    // Input validation
    if (startingARR <= 0) {
        throw new Error('Starting ARR must be greater than zero');
    }
    if (expansions < 0 || contractions < 0 || churn < 0) {
        throw new Error('Revenue components cannot be negative');
    }

    try {
        // Convert to Big instances for precise calculation
        const start = new Big(startingARR);
        const expand = new Big(expansions);
        const contract = new Big(contractions);
        const lost = new Big(churn);

        // Calculate NDR
        const numerator = start.plus(expand).minus(contract).minus(lost);
        const ndr = numerator.div(start).times(100);
        const result = Number(ndr.round(2));

        // Validate result range
        if (result < 0 || result > 200) {
            throw new Error('NDR must be between 0% and 200%');
        }

        return result;
    } catch (error) {
        throw new Error(`NDR calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Calculates Magic Number with precise decimal arithmetic
 * Formula: Net New ARR / Previous Quarter S&M Spend
 * 
 * @param netNewARR - Net new Annual Recurring Revenue
 * @param previousQuarterSMSpend - Sales & Marketing spend from previous quarter
 * @returns Magic Number ratio rounded to 2 decimal places
 * @throws Error if inputs are invalid or result is out of range
 */
export function calculateMagicNumber(
    netNewARR: number,
    previousQuarterSMSpend: number
): number {
    // Input validation
    if (previousQuarterSMSpend <= 0) {
        throw new Error('Previous quarter S&M spend must be greater than zero');
    }

    try {
        // Convert to Big instances for precise calculation
        const arr = new Big(netNewARR);
        const spend = new Big(previousQuarterSMSpend);

        // Calculate Magic Number
        const magicNumber = arr.div(spend);
        const result = Number(magicNumber.round(2));

        // Validate result range
        if (result < 0 || result > 10) {
            throw new Error('Magic Number must be between 0 and 10');
        }

        return result;
    } catch (error) {
        throw new Error(`Magic Number calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Calculates CAC Payback Period with margin validation
 * Formula: (CAC / (ARPA * Gross Margin)) * 12
 * 
 * @param cac - Customer Acquisition Cost
 * @param arpa - Average Revenue Per Account (monthly)
 * @param grossMargin - Gross margin percentage
 * @returns CAC Payback Period in months rounded to 1 decimal place
 * @throws Error if inputs are invalid or result is out of range
 */
export function calculateCACPayback(
    cac: number,
    arpa: number,
    grossMargin: number
): number {
    // Input validation
    if (cac <= 0 || arpa <= 0) {
        throw new Error('CAC and ARPA must be greater than zero');
    }
    if (grossMargin <= 0 || grossMargin > 100) {
        throw new Error('Gross margin must be between 0 and 100');
    }

    try {
        // Convert to Big instances for precise calculation
        const cacValue = new Big(cac);
        const arpaValue = new Big(arpa);
        const margin = new Big(grossMargin).div(100); // Convert to decimal

        // Calculate monthly payback period
        const monthlyFactor = arpaValue.times(margin);
        const paybackMonths = cacValue.div(monthlyFactor);
        const result = Number(paybackMonths.round(1));

        // Validate result range
        if (result < 0 || result > 60) {
            throw new Error('CAC Payback Period must be between 0 and 60 months');
        }

        return result;
    } catch (error) {
        throw new Error(`CAC Payback calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Calculates Pipeline Coverage ratio with target validation
 * Formula: Pipeline Value / Revenue Target
 * 
 * @param pipelineValue - Total pipeline opportunity value
 * @param revenueTarget - Revenue target for the period
 * @returns Pipeline Coverage ratio rounded to 2 decimal places
 * @throws Error if inputs are invalid or result is out of range
 */
export function calculatePipelineCoverage(
    pipelineValue: number,
    revenueTarget: number
): number {
    // Input validation
    if (pipelineValue <= 0) {
        throw new Error('Pipeline value must be greater than zero');
    }
    if (revenueTarget <= 0) {
        throw new Error('Revenue target must be greater than zero');
    }

    try {
        // Convert to Big instances for precise calculation
        const pipeline = new Big(pipelineValue);
        const target = new Big(revenueTarget);

        // Calculate coverage ratio
        const coverage = pipeline.div(target);
        const result = Number(coverage.round(2));

        // Validate result range
        if (result < 1 || result > 10) {
            throw new Error('Pipeline Coverage must be between 1x and 10x');
        }

        return result;
    } catch (error) {
        throw new Error(`Pipeline Coverage calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}