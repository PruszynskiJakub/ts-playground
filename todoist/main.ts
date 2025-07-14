import { TodoistApi } from '@doist/todoist-api-typescript'


const api = new TodoistApi(process.env.TODOIST_API_TOKEN as string);

// api.getTask('6cH4M8865mV7Vmv4')
//     .then((task) => console.log(task))
//     .catch((error) => console.log(error))

// api.getProjects().then(projects => console.log(projects))
api.getSections({projectId: "6Ww97pv5jvPXw6xP"}).then(sections => console.log(sections))