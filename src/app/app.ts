class Vertex {
    x: number
    y: number
    size: number
    data: string

    constructor(x: number, y: number, size: number, data: string) {
        this.x = x
        this.y = y
        this.size = size
        this.data = data
    }
}

class Edge {
    firstVertexID: string
    secondVertexID: string

    constructor(firstVertexID: string, secondVertexID: string) {
        this.firstVertexID = firstVertexID
        this.secondVertexID = secondVertexID
    }
}

class Grapher {
    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D

    private textBox: HTMLInputElement
    private selectionArea: HTMLDivElement

    private canvasCenter: { x: number, y: number } = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }
    private cameraOffset: { x: number, y: number } = { x: 0, y: 0 }
    private cameraScale: number = 1

    private vertexDict: { [id: string]: Vertex } = {}
    private edgeDict: { [id: string]: Edge } = {}

    private selectedVertexIDs: string[] = new Array()
    private selectedEdgeIDs: string[] = new Array()

    private osType: number = 0

    private textInputState: number = 0

    private mousedownState: number = 0
    private mousedownPos: { x: number, y: number } = { x: 0, y: 0 }

    constructor() {
        this.canvas = document.createElement('canvas')
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D

        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight

        this.textBox = document.createElement('input')
        this.textBox.type = 'text'
        this.textBox.setAttribute('id', 'textBox')

        this.selectionArea = document.createElement('div')
        this.selectionArea.setAttribute('id', 'selectionArea')

        document.body.appendChild(this.canvas)
        document.body.appendChild(this.textBox)
        document.body.appendChild(this.selectionArea)

        if (navigator.userAgent.indexOf('Mac') !== -1) this.osType = 1

        this.addEventHandler()
    }

    addGraphFromJSON(data: { [id: string]: any[] }) {
        if (data.hasOwnProperty('vertex')) {
            data['vertex'].forEach((element: { [x: string]: string }) => {
                this.vertexDict[element['_id']] = new Vertex(parseInt(element['x']), parseInt(element['y']), 32, element['data'])
            })
        }

        if (data.hasOwnProperty('edge')) {
            data['edge'].forEach((element: { [x: string]: string }) => {
                this.edgeDict[element['_id']] = new Edge(element['firstVertexID'], element['secondVertexID'])
            })
        }

        this.updateCanvas()
    }

    createVertex(x: number, y: number, size: number, data: string) {
        fetchTest('/api/vertex', 'post', { x: x, y: y, size: size, data: data })
            .then((id: string | number) => {
                console.log(id)

                this.vertexDict[id] = new Vertex(x, y, size, data)

                this.drawVertex(data, x, y, size)
            })
    }

    createEdge(firstVertexID: string, secondVertexID: string) {
        fetchTest('/api/edge', 'post', { firstVertexID: firstVertexID, secondVertexID: secondVertexID })
            .then((id: string | number) => {
                console.log(id)

                this.edgeDict[id] = new Edge(firstVertexID, secondVertexID)

                const firstVertex = this.vertexDict[firstVertexID]
                const secondVertex = this.vertexDict[secondVertexID]

                this.drawEdge(firstVertex.x, firstVertex.y, secondVertex.x, secondVertex.y)
            })
    }

    private findVertexIDWithPos(x: number, y: number): string | null {
        for (const id in this.vertexDict) {
            const vx = this.vertexDict[id].x
            const vy = this.vertexDict[id].y
            const vr = this.vertexDict[id].size

            const px = (x - this.canvasCenter.x) / this.cameraScale - this.cameraOffset.x
            const py = (y - this.canvasCenter.y) / this.cameraScale - this.cameraOffset.y

            if ((vx - px) ** 2 + (vy - py) ** 2 < vr ** 2) {
                return id
            }
        }

        return null
    }

    private findVertexIDsWithArea(x1: number, y1: number, x2: number, y2: number): string[] {
        const start = new Date().getTime()

        // appand or replace => ctrlKey: bool

        const foundVertexIDs = new Array()

        for (const id in this.vertexDict) {
            const vx = this.vertexDict[id].x
            const vy = this.vertexDict[id].y
            const vr = this.vertexDict[id].size

            const px1 = (x1 - this.canvasCenter.x) / this.cameraScale - this.cameraOffset.x
            const py1 = (y1 - this.canvasCenter.y) / this.cameraScale - this.cameraOffset.y
            const px2 = (x2 - this.canvasCenter.x) / this.cameraScale - this.cameraOffset.x
            const py2 = (y2 - this.canvasCenter.y) / this.cameraScale - this.cameraOffset.y

            if (vx - vr > px1 && vx + vr < px2 && vy - vr > py1 && vy + vr < py2) {
                foundVertexIDs.push(id)
            }
        }
        console.log(foundVertexIDs)

        console.log(`check time ${(new Date().getTime() - start)}ms`)
        return foundVertexIDs
    }

    private updateCanvas() {
        this.context.setTransform(1, 0, 0, 1, 0, 0)
        this.context.clearRect(0, 0, window.innerWidth, window.innerHeight)

        this.context.translate(this.canvasCenter.x, this.canvasCenter.y)
        this.context.scale(this.cameraScale, this.cameraScale)
        this.context.translate(this.cameraOffset.x, this.cameraOffset.y)

        for (const id in this.edgeDict) {
            const firstVertex = this.vertexDict[this.edgeDict[id].firstVertexID]
            const secondVertex = this.vertexDict[this.edgeDict[id].secondVertexID]

            this.drawEdge(firstVertex.x, firstVertex.y, secondVertex.x, secondVertex.y)
        }

        for (const id in this.vertexDict) {
            this.drawVertex(this.vertexDict[id].data, this.vertexDict[id].x, this.vertexDict[id].y, this.vertexDict[id].size)
        }

        this.selectedVertexIDs.forEach(id => {
            // fix name ..?
            this.drawVertex('', this.vertexDict[id].x, this.vertexDict[id].y, this.vertexDict[id].size + 4)
        })
    }

    private drawVertex(name: string, x: number, y: number, size: number) {
        this.context.beginPath()
        this.context.arc(x, y, size, 0, 2 * Math.PI)
        this.context.stroke()

        this.context.font = '28px serif'
        this.context.fillText(name, x, y)
    }

    private drawEdge(x1: number, y1: number, x2: number, y2: number) {
        this.context.beginPath()
        this.context.moveTo(x1, y1)
        this.context.lineTo(x2, y2)
        this.context.closePath()
        this.context.stroke()
    }

    private addEventHandler() {
        window.addEventListener('resize', this.onResizeHandler.bind(this))

        this.textBox.addEventListener('keydown', this.onKeydownHandler_TMP.bind(this))
        this.textBox.addEventListener('focusout', this.onFocusoutHandler.bind(this))

        document.body.addEventListener('keydown', this.onKeydownHandler.bind(this))

        document.body.addEventListener('dblclick', this.onDblclickHandler.bind(this))
        document.body.addEventListener('mousedown', this.onMousedownHandler.bind(this))
        document.body.addEventListener('mouseup', this.onMouseupHandler.bind(this))
        document.body.addEventListener('mousemove', this.onMousemoveHandler.bind(this))
        document.body.addEventListener('wheel', this.onWheelHandler.bind(this), { passive: false })
    }

    private onFocusoutHandler(event: FocusEvent) {
        console.log(this.textBox.value)

        if (this.textBox.value !== '') {
            // error pos updated due to mouse down
            // this.createVertex(this.mousedownPos.x, this.mousedownPos.y, 32, this.textBox.value)
        }
        else {
            this.updateCanvas()
        }

        this.textBox.style.display = 'none'
        this.textBox.value = ''
    }

    private onKeydownHandler_TMP(event: KeyboardEvent) {
        // event.preventDefault()
        event.stopPropagation()

        const code = event.code

        if (code === 'Enter') {
            if (this.textBox.value !== '') { // why called twice?
                this.createVertex(this.mousedownPos.x, this.mousedownPos.y, 32, this.textBox.value)

                this.textBox.style.display = 'none'
                this.textBox.value = ''
            }
        }
    }

    private onKeydownHandler(event: KeyboardEvent) {
        event.stopPropagation() // ?

        const code = event.code

        console.log(event.code)

        if (code === 'Enter') {
        }
        else if (code === 'Delete') {
            fetchTest('/api/vertex', 'delete', this.selectedVertexIDs)
                .then((result: boolean) => {
                    console.log(result)

                    if (result) {
                        this.selectedVertexIDs.forEach(vertexID => {
                            delete this.vertexDict[vertexID]

                            Object.keys(this.edgeDict).forEach(edgeId => {
                                const firstVertexID = this.edgeDict[edgeId].firstVertexID
                                const secondVertexID = this.edgeDict[edgeId].secondVertexID

                                if (vertexID === firstVertexID || vertexID === secondVertexID) {
                                    console.log('delete edge', edgeId)

                                    delete this.edgeDict[edgeId]
                                }
                            })
                        })

                        this.selectedVertexIDs.length = 0
                    }

                    this.updateCanvas()
                })
        }
        else if (code === 'KeyC') {
            if (this.selectedVertexIDs.length > 1) {
                this.createEdge(this.selectedVertexIDs[0], this.selectedVertexIDs[1])
            }
        }
        else if (code === 'KeyL') {
            if (this.selectedVertexIDs.length > 0) {
                console.log('relocate', this.selectedVertexIDs[0])
            }
        }
    }

    private onDblclickHandler(event: MouseEvent) {
        // event.preventDefault()
        // event.stopPropagation()

        const x = (event.clientX - this.canvasCenter.x) / this.cameraScale - this.cameraOffset.x
        const y = (event.clientY - this.canvasCenter.y) / this.cameraScale - this.cameraOffset.y

        this.textInputState = 1

        this.drawVertex('', x, y, 32)

        this.mousedownPos = { x: x, y: y }

        this.textBox.style.left = event.clientX + 'px'
        this.textBox.style.top = event.clientY + 'px'
        this.textBox.style.display = 'block'
        this.textBox.focus()
    }

    private onMousedownHandler(event: MouseEvent) {
        // event.preventDefault()
        // event.stopPropagation()

        const x = event.clientX
        const y = event.clientY

        this.mousedownState = event.button + 1
        this.mousedownPos = { x: x, y: y }

        if (this.mousedownState === 1) {
            const vID = this.findVertexIDWithPos(x, y)

            this.selectedVertexIDs.length = 0

            if (vID) {
                this.selectedVertexIDs.push(vID)
                this.mousedownState = 6
            }
            else {
                this.selectionArea.style.left = x + 'px'
                this.selectionArea.style.top = y + 'px'

                this.selectionArea.style.display = 'block'
            }

            this.updateCanvas()
        }
    }

    private onMouseupHandler(event: MouseEvent) {
        // event.preventDefault()
        // event.stopPropagation()

        if (this.mousedownState === 1) {
            const x1 = parseInt(this.selectionArea.style.left)
            const y1 = parseInt(this.selectionArea.style.top)
            const x2 = x1 + parseInt(this.selectionArea.style.width)
            const y2 = y1 + parseInt(this.selectionArea.style.height)

            this.selectedVertexIDs = this.findVertexIDsWithArea(x1, y1, x2, y2)
            this.updateCanvas()
        }

        this.selectionArea.style.width = '0px'
        this.selectionArea.style.height = '0px'

        this.selectionArea.style.display = 'none'


        this.mousedownState = 0
    }

    private onMousemoveHandler(event: MouseEvent) {
        // event.preventDefault()
        // event.stopPropagation()

        if (this.mousedownState === 1) {
            const x = event.clientX
            const y = event.clientY

            this.selectionArea.style.left = (x < this.mousedownPos.x ? x : this.mousedownPos.x) + 'px'
            this.selectionArea.style.top = (y < this.mousedownPos.y ? y : this.mousedownPos.y) + 'px'

            this.selectionArea.style.width = Math.abs(x - this.mousedownPos.x) + 'px'
            this.selectionArea.style.height = Math.abs(y - this.mousedownPos.y) + 'px'
        }
        else if (this.mousedownState === 2) {
            this.cameraOffset.x += event.movementX / this.cameraScale
            this.cameraOffset.y += event.movementY / this.cameraScale

            this.updateCanvas()
        }
        else if (this.mousedownState === 6) {
            const vID = this.selectedVertexIDs[0] // 0 safe? to for

            this.vertexDict[vID].x += event.movementX / this.cameraScale
            this.vertexDict[vID].y += event.movementY / this.cameraScale

            this.updateCanvas()
        }
    }

    private onWheelHandler(event: WheelEvent) {
        event.preventDefault()

        if (this.osType) {
            if (event.ctrlKey) {
                this.cameraScale -= event.deltaY * 0.1

                this.cameraScale = Math.min(this.cameraScale, 8.0)
                this.cameraScale = Math.max(this.cameraScale, 0.2)
            }
            else {
                this.cameraOffset.x -= event.deltaX / this.cameraScale
                this.cameraOffset.y -= event.deltaY / this.cameraScale
            }
        }
        else {
            this.cameraScale -= event.deltaY * 0.001

            this.cameraScale = Math.min(this.cameraScale, 8.0)
            this.cameraScale = Math.max(this.cameraScale, 0.2)
        }

        this.updateCanvas()
    }

    private onResizeHandler(event: Event) {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight

        this.canvasCenter = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }

        this.updateCanvas()
    }
}

const request = new XMLHttpRequest()

const fetchTest = (path: string, method: string, body: any): any => {
    const headers = { 'Content-Type': 'application/json' }

    // csrf ?

    const sbody = JSON.stringify(body)
    console.log(sbody)

    return fetch(path, { method: method, body: sbody, headers })
        .then(res => {
            if (res.status < 200 || res.status >= 300)
                throw new Error(`Request failed with status ${res.status}`)
            return res.json()
        })
}

window.onload = () => {
    const grapher = new Grapher()

    request.open('GET', 'api/graph')
    request.responseType = 'json'
    request.send()

    request.onload = () => {
        grapher.addGraphFromJSON(request.response)
    }
}
