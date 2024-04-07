import bodyParser from 'body-parser'
import express from 'express'
import { join } from 'path'

import { getGraph, addVertex, deleteVertex, addEdge } from './handler'

const app = express()
const port = process.env.PORT || 3000

app.disable('x-powered-by')

app.use(express.static(join(__dirname, '../app')))

app.get('/headers', (req, res) => {
    res.type('text/plain')
    const headers = Object.entries(req.headers).map(([key, value]) => `${key}: ${value}`)
    res.send(headers.join('\n'))
})

app.use(bodyParser.json())

app.get('/api/graph', getGraph)

app.post('/api/vertex', addVertex)
app.delete('/api/vertex', deleteVertex)

app.post('/api/edge', addEdge)

app.use((req, res) => {
    res.type('text/plain')
    res.status(404)
    res.send('404 - Not Found')
})

app.use((err: { message: any }, req: any, res: { type: (arg0: string) => void; status: (arg0: number) => void; send: (arg0: string) => void }, next: any) => {
    console.error(err.message)
    res.type('text/plain')
    res.status(500)
    res.send('500 - Server Error')
})

app.listen(port, () => console.log(`Express started on port ${port}`))
