import { Agent, run } from '@openai/agents';

const historyTutorAgent = new Agent({
    name: 'History Tutor',
    instructions:
        'You provide assistance with historical queries. Explain important events and context clearly.',
});

const mathTutorAgent = new Agent({
    name: 'Math Tutor',
    instructions:
        'You provide help with math problems. Explain your reasoning at each step and include examples',
});

const unknownTutorAgent = new Agent({
    name: 'Other Tutor',
    instructions:
        'You always repeat after the user if the question is not related to math or history.',
});

const triageAgent = new Agent({
    name: 'Triage Agent',
    instructions:
        "You determine which agent to use based on the user's homework question",
    handoffs: [historyTutorAgent, mathTutorAgent, unknownTutorAgent],
});

async function main() {
    const result = await run(triageAgent, 'Answer the question "Recipe for apple pie ?" and tell me who answered it - which tutor ?');
    console.log(result.finalOutput);
}

main().catch((err) => console.error(err));