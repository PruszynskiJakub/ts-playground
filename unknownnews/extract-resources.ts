import {createWebService} from './web.service';
import {createOpenAIService} from './openai.service';
import {createTodoistService} from './todoist.service';
import {TodoistApi} from '@doist/todoist-api-typescript';
import OpenAI from 'openai';
import type {ChatCompletion} from "openai/resources/chat/completions";
import {generateIdeas} from "../ideas/prompts.ts";

interface Resource {
    url: string;
    title: string;
    description: string;
    category: 'video' | 'article' | 'repository';
}

interface ExtractedResources {
    result: Resource[];
}

async function extractResources() {
    // Initialize services
    const webService = createWebService({
        SERPER_API_KEY: process.env.SERPER_API_KEY!
    });

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!
    });
    const openaiService = createOpenAIService(openaiClient);

    const todoistClient = new TodoistApi(process.env.TODOIST_API_TOKEN!);
    const todoistService = createTodoistService(todoistClient);

    try {
        // Step 1: Scrape the webpage
        console.log('Scraping webpage...');
        const documents = await webService.scrapeWebpage(['https://mrugalski.pl/nl/wu/pgXSBgZgt8Ba1dAVfuTGZQ']);
        const content = documents[0].text;

        // Step 2: Use AI to extract resources matching interests
        console.log('Extracting resources with AI...');
        const prompt = `
        Analyze the following webpage content and extract resources (links, articles, videos, repositories) that match these interests:
        - Productivity tools and techniques
        - AI and machine learning
        - Large Language Models (LLMs)
        
        For each relevant resource, extract:
        - url: The full URL
        - title: A descriptive title
        - description: A brief description of what it offers
        - category: Classify as 'video', 'article', or 'repository'
        
        Return the results as a JSON object with a "result" property containing an array of resources.
        Only include resources that are clearly relevant to the specified interests.
        
        Content to analyze:
        ${content}
        `;

        const aiResponse: ChatCompletion = await openaiService.chatCompletion(
            [
                {
                    role: "system",
                    content: prompt
                }
            ],
            {
                model: "gpt-4.1",
                temperature: 0.1
            }
        ) as OpenAI.Chat.Completions.ChatCompletion;

        // Step 3: Parse AI response as JSON
        const extractedResources: ExtractedResources = JSON.parse(aiResponse.choices[0]?.message?.content || "");
        console.log(`Found ${extractedResources.result.length} relevant resources`);

        // Step 4: Add resources as Todoist tasks
        const projectId = '6Ww97pv5jvPXw6xP';
        const sectionIds = {
            video: '6Xc5X2wCfQqr66Vw',
            article: '6Xc5X3H42r3j8fxw',
            repository: '6c23Jmc6hmRfQj8w'
        };

        const tasks = extractedResources.result.map(resource => {
            // Truncate title if too long (Todoist has a limit)
            const maxTitleLength = 100;
            const truncatedTitle = resource.title.length > maxTitleLength 
                ? resource.title.substring(0, maxTitleLength) + "..."
                : resource.title;
            
            return {
                content: truncatedTitle,
                options: {
                    projectId,
                    description: `${resource.description}\n\nURL: ${resource.url}`,
                    priority: 2,
                    sectionId: sectionIds[resource.category]
                }
            };
        });

        console.log(tasks)

        if (tasks.length > 0) {
            console.log('Adding tasks to Todoist...');
            const createdTasks = await todoistService.addTask(tasks);
            console.log(`Successfully added ${createdTasks.length} tasks to Todoist`);
        } else {
            console.log('No relevant resources found to add');
        }

        return extractedResources;

    } catch (error) {
        console.error('Error in extractResources:', error);
        throw error;
    }
}

// Run the script if called directly
if (import.meta.main) {
    extractResources()
        .then(result => {
            console.log('Extraction completed successfully');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

export {extractResources};