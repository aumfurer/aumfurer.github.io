class CardPainter {
    WIDTH = 600
    HEIGHT = 920

    BORDER_1 = 'im1'
    BORDER_2 = 'im2'
    BORDER_UNCOLORED = 'imu'

    TITLE = {
        y: 110,
        fontSize: 50,
        get maxWidth() {
            return 480 - 2 * this._self.previewSize
        },
        _self: this
    }
    TYPES = {
        y: 840,
        fontSize: 40,
        get maxWidth() {
            return 450 - 2 * this._self.costSize
        },
        _self: this
    }

    DESCRIPTION_CONFIG = {x: 72, y: 500, width: 456, height: 285, fontSize: 40}

    COST = {x: 65, y: 845, fontSize: 65}
    PREVIEW = {x: 50, y: 110, fontSize: 60}
    ART = {x: 70, y: 880, fontSize: 20, color: 'white'}
    VERSION = {x: 530, y: 880, fontSize: 20, color: 'white'}

    EXPANSION = {x: 515, y: 805, width: 40}

    IMG = {border: 50, top: 120, height: 360}

    costSize = 0
    previewSize = 0

    _dw = null

    constructor(ctx, data, images) {
        this.data = data;
        this.ctx = ctx
        this.imgs = images
    }

    get dw() {
        return this._dw || (this._dw = new DescriptionWriter(this.ctx, this.data.description, this.DESCRIPTION_CONFIG))
    }

    paintedColoredImg(img, color, filter) {
        let canvas = document.createElement("canvas");
        canvas.width = this.WIDTH
        canvas.height = this.HEIGHT
        let ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = filter;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.drawImage(this.imgs[img], 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.imgs[img], 0, 0);
        return canvas
    }

    paintBaseCard() {
        this.ctx.drawImage(this.paintedColoredImg(this.BORDER_1, this.data.color[0], this.data.filter[0]), 0, 0)
        if (this.data.filter[1] !== 'hidden')
            this.ctx.drawImage(this.paintedColoredImg(this.BORDER_2, this.data.color[1], this.data.filter[1]), 0, 0)
        this.ctx.drawImage(this.imgs[this.BORDER_UNCOLORED], 0, 0)
    }

    writeCenteredTrajanText(text, y, fontSize, maxWidth) {
        this.ctx.save()
        let fs = fontSize;
        this.ctx.font = `Normal 700 ${fs | 0}px Trajan Pro`
        let textWidth = this.ctx.measureText(text).width;
        if (textWidth > maxWidth) {
            fs *= maxWidth / textWidth
            this.ctx.font = `Normal 700 ${fs | 0}px Trajan Pro`
        }
        this.ctx.textAlign = 'center'
        this.ctx.fillText(text, this.WIDTH / 2, y - (fontSize - fs) / 2)
        this.ctx.restore()
    }

    writeName() {
        this.writeCenteredTrajanText(this.data.name, this.TITLE.y, this.TITLE.fontSize, this.TITLE.maxWidth)
    }

    writeTypes() {
        let types = this.data.types.split(' - ')
        if (types.length <= 3) {
            this.writeCenteredTrajanText(this.data.types, this.TYPES.y, this.TYPES.fontSize, this.TYPES.maxWidth)
        } else {
            this.writeCenteredTrajanText(
                types.slice(0, 2).join(' - '),
                this.TYPES.y - +this.TYPES.fontSize / 2,
                this.TYPES.fontSize / 2,
                this.TYPES.maxWidth
            )
            this.writeCenteredTrajanText(
                types.slice(2).join(' - '),
                this.TYPES.y,
                this.TYPES.fontSize / 2,
                this.TYPES.maxWidth
            )
        }
    }

    writeIcons(text, fontSize, x, y) {
        this.ctx.save()
        this.ctx.font = `${fontSize}px sans-serif`
        let tokens = new TokenArray(tokenize(text, [TokenIcon]), false)
        tokens.paint(this.ctx, x, y)
        let result = tokens.width(this.ctx)
        this.ctx.restore()
        return result
    }

    writeCost() {
        this.costSize = this.writeIcons(this.data.cost, this.COST.fontSize, this.COST.x, this.COST.y)
    }

    writePreview() {
        this.previewSize = this.writeIcons(this.data.preview, this.PREVIEW.fontSize, this.PREVIEW.x, this.PREVIEW.y)
        let x = this.WIDTH - this.PREVIEW.x - this.previewSize
        this.writeIcons(this.data.preview, this.PREVIEW.fontSize, x, this.PREVIEW.y)
    }

    paintImg() {
        this.ctx.save()
        const img = this.imgs['img']
        if (!img)
            return
        const spaceWidth = this.WIDTH - 2 * this.IMG.border
        const scale = Math.max(spaceWidth / img.width, this.IMG.height / img.height) * this.data.zoom
        this.ctx.save()
        this.ctx.translate(this.WIDTH / 2, this.IMG.top + this.IMG.height / 2)
        this.ctx.scale(scale, scale)
        this.ctx.translate(-img.width / 2, -img.height / 2)
        let stepX = (spaceWidth / scale - img.width) / 2
        let stepY = (this.IMG.height / scale - img.height) / 2
        this.ctx.drawImage(img, this.data.deltaX * stepX, this.data.deltaY * stepY)
        this.ctx.restore()
        this.ctx.globalCompositeOperation = 'destination-in';
        this.ctx.fillRect(this.IMG.border, this.IMG.top, this.WIDTH - 2 * this.IMG.border, this.IMG.height)
        this.ctx.restore()
    }

    writeArt() {
        this.ctx.save()
        this.ctx.fillStyle = this.ART.color
        this.ctx.font = 'bold ' + this.ART.fontSize + "px Roman";
        this.ctx.fillText(this.data.art, this.ART.x, this.ART.y)
        this.ctx.restore()
    }

    writeVersion() {
        this.ctx.save()
        this.ctx.fillStyle = this.VERSION.color
        this.ctx.textAlign = 'right'
        this.ctx.font = 'bold ' + this.VERSION.fontSize + "px Roman";
        this.ctx.fillText(this.data.version, this.VERSION.x, this.VERSION.y)
        this.ctx.restore()
    }

    paintExpansion() {
        const exp = this.imgs['exp']
        if (!exp)
            return
        const scale = this.EXPANSION.width / Math.max(exp.width,  exp.height) * this.data.zoom
        this.ctx.save()
        this.ctx.translate(this.EXPANSION.x, this.EXPANSION.y)
        this.ctx.scale(scale, scale)
        this.ctx.drawImage(exp, 0, 0)
        this.ctx.restore()
    }

    paint() {
        this.ctx.save()
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT)
        this.paintImg()
        this.paintBaseCard()
        this.writeName()
        this.writeCost()
        this.writePreview()
        this.writeTypes()
        this.dw.writeText()
        this.paintExpansion()
        this.writeArt()
        this.writeVersion()
        this.ctx.restore()
    }
}

class HorizontalCardPainter extends CardPainter {
    WIDTH = 2151
    HEIGHT = 1403

    BORDER_1 = 'ime1'
    BORDER_2 = 'ime2'
    BORDER_UNCOLORED = 'imeu'
    BORDER_UNCOLORED_2 = 'imeu2'

    IMG = {border: 130, top: 218, height: 730}

    TITLE = {
        y: 185,
        fontSize: 90,
        maxWidth: 800,
    }
    TYPES = {
        y: 0,
        fontSize: 120,
        maxWidth: 255,
    }

    COST = {x: 135, y: 255, fontSize: 155}

    DESCRIPTION_CONFIG = {x: 160, y: 950, width: 1831, height: 285, fontSize: 80}

    ART = {x: 180, y: 1295, fontSize: 50, color: 'black'}
    VERSION = {x: 1971, y: 1295, fontSize: 50, color: 'black'}

    EXPANSION = {x: 1895, y: 1165, width: 80}

    writeTypes() {
        this.ctx.save()
        this.ctx.translate(1105, -680)
        this.ctx.translate(0, 200)
        this.ctx.rotate(Math.PI / 4)
        super.writeTypes();
        this.ctx.restore()
    }

    paintBaseCard() {
        super.paintBaseCard()
        let filter = this.data.filter[0] === 'screen' ? 'overlay': this.data.filter[0]
        this.ctx.drawImage(this.paintedColoredImg(this.BORDER_UNCOLORED_2, this.data.color[0], filter), 0, 0)

    }

    writePreview() {
    }
}