export const pickAccountsPrompt = (accounts: string) => {
    return `# Account Selection Prompt

<prompt_objective>
Analyze transaction descriptions to determine the accounts involved and provide a structured JSON response with reasoning and account details.
</prompt_objective>

<facts>
- Default account for transactions: Pekao - Basic
- Default business account: Pekao - Next Step Studio
- Available account types: checking, savings, creditCard, personalLoan, otherAsset
</facts>

<prompt_rules>
- MUST ALWAYS include the 'account' field with a valid account object
- MUST include 'payee' for:
  * Internal transfers between accounts (saving, investing)
  * Loan-related transactions
  * Any transaction where money moves between two known accounts
- MUST use Pekao-Basic when no specific account is mentioned
- MUST use Pekao-Next Step Studio when "business" is mentioned
- MUST NEVER create or reference accounts not in the provided list
- MUST include clear reasoning explaining the account selection logic
</prompt_rules>

<available_accounts>
${accounts}
</available_accounts>

<prompt_examples>
USER: "Transfered 500 PLN from business account"
AI: {
    "_reasoning": "Using business account (Pekao - Next Step Studio) as source due to 'business account' mention, with Pekao-Basic as default recipient for transfer",
    "account": {
        "id": "74b62003-e493-4472-a874-451b45fa37a8",
        "name": "Pekao - Next Step Studio",
        "type": "checking"
    },
    "payee": {
        "id": "e28772f5-5581-44ce-90d2-a96e3d66f17e",
        "name": "Pekao - Basic",
        "type": "checking"
    }
}

USER: "Transfered 500 PLN to business account"
AI: {
    "_reasoning": "Using business account (Pekao - Next Step Studio) as source due to 'business account' mention, with Pekao-Basic as default recipient for transfer",
    "account": {
        "id": "f642f5db-efcc-425e-a69e-59242628d143",
        "name": "Pekao - Basic",
        "type": "checking"
    },
    "payee": {
        "id": "2b52520c-cdc7-4dad-a7da-2dbfbedf9775",
        "name": "Pekao - Next Step Studio",
        "type": "checking"
    }
}

USER: "Paid 50 PLN for groceries"
AI: {
    "_reasoning": "Using default personal account (Pekao-Basic) as no specific account mentioned for regular purchase",
    "account": {
        "id": "f642f5db-efcc-425e-a69e-59242628d143",
        "name": "Pekao - Basic",
        "type": "checking"
    }
}

USER: "Spend 1430 for furniture with my credit card"
AI: {
    "_reasoning": "Using credit card account due to explicit mention of 'credit card' in transaction description",
    "account": {
        "id": "4ca9b037-54f2-4e9c-841a-381d739cf566",
        "name": "Pekao - Credit Card",
        "type": "creditCard"
    }
}

USER: "Paid off 2k my mom"
AI: {
    "_reasoning": "Transfer from default account to Mom loan account for debt repayment",
    "account": {
        "id": "f642f5db-efcc-425e-a69e-59242628d143",
        "name": "Pekao - Basic",
        "type": "checking"
    },
    "payee": {
        "id": "8ce51809-a6f7-402d-88b1-f559baa0c3af",
        "name": "Mom loan",
        "type": "personalLoan"
    }
}

USER: "Paid off 1,6k my dad from business account"
AI: {
    "_reasoning": "Using business account for dad loan repayment due to explicit mention of 'business account'",
    "account": {
        "id": "74b62003-e493-4472-a874-451b45fa37a8",
        "name": "Pekao - Next Step Studio",
        "type": "checking"
    },
    "payee": {
        "id": "b79fc473-676c-4cfc-8c25-38dba7ed7eb4",
        "name": "Dad loan",
        "type": "personalLoan"
    }
}

USER: "Invested 1k"
AI: {
    "_reasoning": "Transfer from default account to Investment wallet for investment purposes",
    "account": {
        "id": "f642f5db-efcc-425e-a69e-59242628d143",
        "name": "Pekao - Basic",
        "type": "checking"
    },
    "payee": {
        "id": "7fc7c2c6-5302-4ebb-97e1-cc76fa82cea5",
        "name": "Investment wallet",
        "type": "otherAsset"
    }
}

USER: "Paid off apartment for 5,5k from mbank"
AI: {
    "_reasoning": "Using Mbank account as explicitly mentioned in the transaction",
    "account": {
        "id": "afab1423-e83d-4854-933f-36df25b2882d",
        "name": "Mbank",
        "type": "checking"
    }
}

USER: "Saved 500 PLN"
AI: {
    "_reasoning": "Transfer from default account to Piggy bank for savings",
    "account": {
        "id": "f642f5db-efcc-425e-a69e-59242628d143",
        "name": "Pekao - Basic",
        "type": "checking"
    },
    "payee": {
        "id": "d1336a6f-cdc1-40cd-9061-6a897a890bf4",
        "name": "Pekao - Piggy bank",
        "type": "savings"
    }
}
</prompt_examples>

When analyzing transaction descriptions, follow these steps:
1. Look for explicit account mentions (business, credit card, specific bank names)
2. Identify transaction type (transfer, payment, saving, investing)
3. Apply default account rules when no specific account is mentioned
4. Determine if payee should be included based on transaction type
5. Provide clear reasoning for the account selection
6. Return complete JSON response with all required fields`;
}

export const pickAmountPrompt = () => {
    return `# Transaction Type, Amount, and Currency Classifier

<prompt_objective>
Analyse transaction descriptions to determine transaction type, amount, and currency, returning the appropriate JSON response with correctly signed amounts and currency or error details.
</prompt_objective>

<prompt_rules>
1. CLASSIFICATION RULES:
- Inflow indicators: "got paid", "received", "refund", "salary"
- Outflow indicators: "spent", "paid for", "bought", "for", "subscription", "had"
- When detecting outflow, ALWAYS make the amount negative
- When detecting inflow, ALWAYS keep the amount positive

2. CURRENCY RULES:
- DEFAULT currency is PLN if none specified
- Recognize explicit currency mentions (PLN, USD, EUR, etc.)
- Currency can appear before or after amount (e.g., "PLN 100" or "100 PLN")
- Currency should be stored in UPPERCASE format

3. ERROR HANDLING:
- If amount is missing, return MISSING_AMOUNT error
- If description is unclear/ambiguous, return AMBIGUOUS_DESCRIPTION error
- If format is invalid, return INVALID_FORMAT error

4. OUTPUT FORMAT:
Success case: 
{
    "type": "inflow" | "outflow",
    "amount": number,
    "currency": string
}

Error case:
{
    "error": {
        "code": string,
        "message": string
    }
}
</prompt_rules>

<prompt_examples>
Input: "I got paid 5500 PLN from the institute"
Output: {"type": "inflow", "amount": 5500, "currency": "PLN"}

Input: "I had a cup of coffee for 10 EUR"
Output: {"type": "outflow", "amount": -10, "currency": "EUR"}

Input: "Spent 99 for subscription"
Output: {"type": "outflow", "amount": -99, "currency": "PLN"}

Input: "USD 50 received from client"
Output: {"type": "inflow", "amount": 50, "currency": "USD"}

Input: "Money transfer"
Output: {
    "error": {
        "code": "MISSING_AMOUNT",
        "message": "Amount not specified. Please provide the transaction amount."
    }
}

Input: "Something happened with my account"
Output: {
    "error": {
        "code": "AMBIGUOUS_DESCRIPTION",
        "message": "Description is ambiguous. Please provide more details about the transaction type and amount."
    }
}

Input: "Transferred 100 from my second account"
Output: {"type": "outflow", "amount": -100, "currency": "PLN"}

Input: "Transferred 100 to my second account"
Output: {"type": "inflow", "amount": 100, "currency": "PLN"}
</prompt_examples>

<constraints>
- MUST always return valid JSON
- MUST include negative sign for outflow amounts
- MUST return error object when unable to determine type or amount
- MUST extract numerical amount from text, ignoring currency symbols
- MUST include currency field in all successful responses
- MUST use PLN as default currency when none specified
- MUST store currency codes in UPPERCASE
</constraints>`;
}

export const pickCategoryPrompt = (categories: string) => {
    return `# Transaction Categorization System

<prompt_objective>
Analyze a transaction description and categorize it into the most appropriate predefined category, providing a clear reasoning for the choice.
</prompt_objective>

<available_categories>
${categories}
</available_categories>

<prompt_rules>
- ALWAYS analyze both the content and context of the transaction
- MUST include complete category information (id, name, group_id, and group_name) in a properly formatted JSON
- MUST provide reasoning in 1-3 clear sentences
- If no specific category matches, use "Uncategorized" (id: c0b087da-25ec-4ccb-8f08-17ea30daea3a)
- For income/salary transactions, use "Inflow: Ready to Assign" (id: ca570c65-57d8-488e-96f3-946d836fde23)
- When multiple categories could apply, choose the most specific one
</prompt_rules>

<prompt_examples>
USER: "I had a cup of coffee for 10 PLN"
AI: {
    "_reasoning": "Transaction mentions coffee purchase, which best fits into the Coffee shops category under Food & Dining due to the specific beverage and typical coffee shop amount.",
    "category": {
        "id": "27fea14e-e7f3-496a-873e-bd913b4f6e3d",
        "name": "Coffee shops",
        "category_group_id": "6763ba72-9645-46e5-aa9f-c29be6cb4504",
        "category_group_name": "Food & Dining"
    }
}

USER: "I got paid 5500 PLN from the institute"
AI: {
    "_reasoning": "This is a salary/income payment, which should be categorized as ready to assign for proper budget allocation.",
    "category": {
        "id": "ca570c65-57d8-488e-96f3-946d836fde23",
        "name": "Inflow: Ready to Assign",
        "category_group_id": "c7fcc1f5-fd40-4d39-9959-2105607595ef",
        "category_group_name": "Internal Master Category"
    }
}

USER: "Spent 99 PLN for groceries"
AI: {
    "_reasoning": "Transaction explicitly mentions groceries, making it a clear match for the Groceries category under Food & Dining.",
    "category": {
        "id": "62beca08-69fc-481e-80a8-4ff54fd74762",
        "name": "Groceries",
        "category_group_id": "6763ba72-9645-46e5-aa9f-c29be6cb4504",
        "category_group_name": "Food & Dining"
    }
}

USER: "Monthly Netflix subscription 45 PLN"
AI: {
    "_reasoning": "This is a streaming service subscription payment, which falls under Entertainment & Recreation's streaming subscriptions category.",
    "category": {
        "id": "1493fb10-c58b-49a8-8648-4bedebbda738",
        "name": "Streaming subscriptions",
        "category_group_id": "346bc674-bf33-447f-b956-cba7028ef121",
        "category_group_name": "Entertainment & Recreation"
    }
}

USER: "Random transaction with no clear category"
AI: {
    "_reasoning": "Transaction description lacks specific details to determine an appropriate category, defaulting to Uncategorized.",
    "category": {
        "id": "c0b087da-25ec-4ccb-8f08-17ea30daea3a",
        "name": "Uncategorized",
        "category_group_id": "c7fcc1f5-fd40-4d39-9959-2105607595ef",
        "category_group_name": "Internal Master Category"
    }
}

USER: "Spend 23 PLN on a climbing session"
AI: {
    "_reasoning": "This is a fitness activity, which falls under Fitness category.",
    "category": {
        "id": "588a3cd5-a50f-44d1-9d71-08cfde240538",
        "name": "Fitness",
        "category_group_id": "ee933024-d0f3-4c6a-b209-dbca2db3d9b4",
        "category_group_name": "Personal Care & Wellness"
    }
}
</prompt_examples>

The AI is ready to analyze and categorize transactions based on their descriptions, providing complete category information and clear reasoning for each categorization.`;
}

export const splitTransactionPrompt = () => {
    return `Parse a text containing multiple financial transactions and convert it into a JSON object with a "result" field containing an array of transaction objects, where each object represents a single, paraphrased transaction or an error if parsing fails.

RULES:
1. ALWAYS split input text into individual transactions
2. ALWAYS maintain all transaction details (amount, currency, description)
3. ALWAYS paraphrase each transaction into a clear, complete sentence
4. MUST return a JSON object with a single "result" field containing the array
5. MUST include error handling for invalid transactions
6. NEVER omit any transaction from the input
7. NEVER modify numerical values or currency codes
8. ALWAYS use proper spelling in output
9. ALWAYS format currency with a space between amount and code (e.g., "500 PLN" not "500PLN")
10. ALWAYS the default currency is PLN

ERROR CODES:
- INVALID_AMOUNT: Amount missing or malformed
- MISSING_DESCRIPTION: Unclear transaction description
- PARSE_ERROR: Cannot properly separate transaction

OUTPUT FORMAT:
{
    "result": [
        // Successful transaction:
        {
            "query": "Paraphrased transaction sentence"
        },
        // Error case:
        {
            "query": "Original problematic text",
            "error_code": "ERROR_CODE",
            "error_message": "Detailed error explanation"
        }
    ]
}

EXAMPLES:
Input: "I bought a cup of coffee for 19.99PLN, also spend 177.65 for building materials, and another 23PLN for Uber."
Output: {
    "result": [
        {
            "query": "Spent 19.99 PLN on a cup of coffee"
        },
        {
            "query": "Purchased building materials for 177.65 PLN"
        },
        {
            "query": "Paid 23 PLN for Uber"
        }
    ]
}

Input: "Transfered 500 from business account then paid 200PLN for the accountant."
Output: {
    "result": [
        {
            "query": "Transferred 500 PLN from business account"
        },
        {
            "query": "Paid 200 PLN for accountant services"
        }
    ]
}

You are a transaction parser. Your task is to parse the provided text into distinct transactions, paraphrase each one clearly, and return a JSON object with a "result" field containing an array of transaction objects. Include error objects for any invalid transactions. Follow all rules strictly and maintain proper formatting in the output.`;
}