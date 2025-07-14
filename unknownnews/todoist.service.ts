import { TodoistApi } from '@doist/todoist-api-typescript';
import type { Task } from '@doist/todoist-api-typescript';

// Factory function that takes a TodoistApi client and returns pure functions
export const createTodoistService = (client: TodoistApi) => {

    // Function to add a task to Todoist
    const addTask = async (
        content: string,
        options?: { projectId?: string; description?: string; priority?: number }
    ): Promise<Task> => {
        try {
            const task = await client.addTask({
                content,
                projectId: options?.projectId,
                description: options?.description,
                priority: options?.priority ?? 1,
            });

            return task;
        } catch (error) {
            console.error("Error adding task to Todoist:", error);
            throw error;
        }
    };

    return {
        addTask,
    };
};