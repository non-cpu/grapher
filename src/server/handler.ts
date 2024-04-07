import { MongoClient, Collection, ObjectId } from 'mongodb'

let vertexCollection: Collection
let edgeCollection: Collection

MongoClient.connect(`mongodb://${process.env.MONGO_URI || 'localhost'}/grapher`)
    .then(client => {
        const db = client.db('grapher')

        vertexCollection = db.collection('vertex')
        edgeCollection = db.collection('edge')
    })

const getGraph = async (req: any, res: any) => {
    const vertex = await vertexCollection.find().toArray()
    const edge = await edgeCollection.find().toArray()

    const graph = { vertex: vertex, edge: edge }

    res.json(graph)
}

const addVertex = async (req: any, res: any) => {
    console.log(req.body)

    vertexCollection.insertOne(req.body)
        .then(
            result => res.json(result.insertedId),
            err => console.error('Failed to save document:', err.stack)
        )
}

const addEdge = async (req: any, res: any) => {
    console.log(req.body)

    edgeCollection.insertOne(req.body)
        .then(
            result => res.json(result.insertedId),
            err => console.error('Failed to save document:', err.stack)
        )
}

const deleteVertex = async (req: any, res: any) => {
    console.log(req.body)

    const oi: ObjectId[] = new Array()

    for (let i = 0; i < req.body.length; i++) {
        oi[i] = new ObjectId(req.body[i]);
    }

    edgeCollection.deleteMany({ $or: [{ firstVertexID: { $in: req.body } }, { secondVertexID: { $in: req.body } }] })
        .then(
            result => {
                console.log('edge', result.acknowledged, result.deletedCount)

                vertexCollection.deleteMany({ _id: { $in: oi } })
                    .then(
                        result => {
                            console.log('vertex', result.acknowledged, result.deletedCount)

                            res.json(result.acknowledged)
                        },
                        err => console.error('Failed to delete document:', err.stack)
                    )
            },
            err => console.error('Failed to delete document:', err.stack)
        )

    // Promise.
}

const deleteEdge = async (req: any, res: any) => { }

export { getGraph, addVertex, addEdge, deleteVertex, deleteEdge }
