import { TodoistApi } from '@doist/todoist-api-typescript'


const api = new TodoistApi(process.env.TODOIST_API_TOKEN as string);

api.getTask('6cH4M8865mV7Vmv4')
    .then((task) => console.log(task))
    .catch((error) => console.log(error))