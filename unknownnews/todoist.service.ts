import { TodoistApi } from '@doist/todoist-api-typescript';
import type { Task } from '@doist/todoist-api-typescript';

// Factory function that takes a TodoistApi client and returns pure functions
export const createTodoistService = (client: TodoistApi) => {

    // Helper function to add a single task to Todoist
    const addSingleTask = async (
        content: string,
        options?: { projectId?: string; description?: string; priority?: number; sectionId?: string }
    ): Promise<Task> => {
        try {
            // Build task object, only including defined properties
            const taskData: any = {
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

            const task = await client.addTask(taskData);
            return task;
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