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
            const task = await client.addTask({
                content,
                projectId: options?.projectId,
                description: options?.description,
                priority: options?.priority ?? 1,
                sectionId: options?.sectionId,
            });

            return task;
        } catch (error) {
            console.error(`Error adding task "${content}" to Todoist:`, error);
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