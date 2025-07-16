import type {Task} from '@doist/todoist-api-typescript';
import {type AddTaskArgs, TodoistApi} from '@doist/todoist-api-typescript';

const projectId = '6Ww97pv5jvPXw6xP';
const sectionIds = {
    video: '6Xc5X2wCfQqr66Vw',
    article: '6Xc5X3H42r3j8fxw',
    repository: '6c23Jmc6hmRfQj8w'
};


// Factory function that takes a TodoistApi client and returns pure functions
export const createTodoistService = (client: TodoistApi) => {

    // Helper function to add a single task to Todoist
    const addSingleTask = async (
        content: string,
        options?: { projectId?: string; description?: string; priority?: number; sectionId?: string }
    ): Promise<Task> => {
        try {
            // Build task object, only including defined properties
            const taskData: AddTaskArgs = {
                content,
            };

            if (options?.projectId) {
                taskData.projectId = options.projectId;
            }
            if (options?.description) {
                taskData.description = options.description;
            }
            if (options?.priority !== undefined) {
                taskData.priority = options.priority;
            }
            if (options?.sectionId) {
                taskData.sectionId = options.sectionId;
            }

            return await client.addTask(taskData);
        } catch (error) {
            console.error(`Error adding task "${content}" to Todoist:`, error);
            console.error('Task data:', { content, options });
            throw error;
        }
    };

    // Function to add multiple tasks to Todoist in parallel
    const addTask = async (
        tasks: Array<{
            content: string;
            options?: { projectId?: string; description?: string; priority?: number; sectionId?: string };
        }>
    ): Promise<Task[]> => {
        try {
            const taskPromises = tasks.map(({ content, options }) => 
                addSingleTask(content, options)
            );
            return await Promise.all(taskPromises);
        } catch (error) {
            console.error("Error adding tasks to Todoist:", error);
            throw error;
        }
    };

    return {
        addTask,
    };
};