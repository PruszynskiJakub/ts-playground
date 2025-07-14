import { TodoistApi } from '@doist/todoist-api-typescript'

const api = new TodoistApi('YOUR_API_TOKEN')

api.getTask('6X4Vw2Hfmg73Q2XR')
    .then((task) => console.log(task))
    .catch((error) => console.log(error))