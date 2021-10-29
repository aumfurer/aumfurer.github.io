class CardPainter {
    static WIDTH
    static HEIGHT

    get WIDTH() {
        return this.constructor.WIDTH
    }

    get HEIGHT() {
        return this.constructor.HEIGHT
    }

    BASE = 'vertical'
    MASK_1 = 'verticalMask1'
    MASK_UNCOLORED = 'verticalMaskUncolored'

    static VARIATIONS = {normal: ''}

    TITLE = {y: 0, fontSize: 0, maxWidth: 0}
    TYPES = {y: 0, fontSize: 0, maxWidth: 0}

    DESCRIPTION_CONFIG = {x: 0, y: 0, width: 0, height: 0, fontSize: 0}

    COST = {x: 0, y: 0, fontSize: 0}
    PREVIEW = {x: 0, y: 0, fontSize: 0}
    ART = {x: 0, y: 0, fontSize: 0, color: ''}
    VERSION = {x: 0, y: 0, fontSize: 0, color: ''}
    EXPANSION = {x: 0, y: 0, width: 0}
    IMG = {border: 0, top: 0, height: 0}

    costSize = 0
    previewSize = 0

    constructor(ctx, data, images) {
        this.data = data;
        this.ctx = ctx
        this.imgs = images
    }

    _dw = null

    get dw() {
        return this._dw || (this._dw = new DescriptionWriter(this.ctx, this.data.description, this.DESCRIPTION_CONFIG))
    }

    paintedColoredImg(img, color, filter) {
        let canvas = document.createElement("canvas");
        canvas.width = this.WIDTH
        canvas.height = this.HEIGHT
        let ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = filter.replace(/[\d*]/g, '');
        ctx.fillStyle = color;
        if (filter?.startsWith('lighter'))
            ctx.fillStyle += filter.slice(7)
        if (filter.length && !filter.endsWith('*'))
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.drawImage(this.imgs[this.BASE], 0, 0);
        if (filter.length && filter.endsWith('*'))
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.imgs[img], 0, 0);
        return canvas
    }

    paintBaseCard() {
        this.ctx.drawImage(this.paintedColoredImg(this.MASK_1, this.data.color[0], this.data.filter[0]), 0, 0)
        if (this.data.filter[1] !== 'hidden') {
            const mask = this.constructor.VARIATIONS[this.data.variation] || this.constructor.VARIATIONS['default']
            this.ctx.drawImage(this.paintedColoredImg(mask, this.data.color[1], this.data.filter[1]), 0, 0)
        }
        this.ctx.drawImage(this.paintedColoredImg(this.MASK_UNCOLORED, 'black', ''), 0, 0)
    }

    _font_color(c) {
        if (c === 1 && this.data.filter[c] === 'hidden')
            return this._font_color(0)
        if (this.data.filter[c] !== 'multiply')
            return 'black'
        const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(this.data.color[c].charAt(i), 16))
        const value = 0.21 * r + 0.72 * g + 0.072 * b;
        return value < 7 ? 'white' : 'black'
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
        const img = this.imgs['img']
        if (!img)
            return
        this.ctx.save()
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
        const scale = this.EXPANSION.width / Math.max(exp.width, exp.height)
        this.ctx.save()
        this.ctx.translate(this.EXPANSION.x, this.EXPANSION.y)
        this.ctx.scale(scale, scale)
        this.ctx.drawImage(exp, 0, 0)
        this.ctx.restore()
    }

    writeDescription() {
        this.dw.writeText()
    }

    paint() {
        this.ctx.save()
        this.ctx.fillStyle = this._font_color(0)
        const scale = this.ctx.canvas.width / this.WIDTH
        this.ctx.scale(scale, scale)
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT)
        this.paintImg()
        this.paintBaseCard()
        this.writePreview()
        this.writeCost()
        this.writeName()
        this.writeTypes()
        this.writeDescription();
        this.paintExpansion()
        this.writeArt()
        this.writeVersion()
        this.ctx.restore()
    }
}

class VerticalCardPainter extends CardPainter {

    static WIDTH = 1403
    static HEIGHT = 2151

    get WIDTH() {
        return this.constructor.WIDTH
    }

    get HEIGHT() {
        return this.constructor.HEIGHT
    }

    BASE = 'vertical'
    MASK_1 = 'verticalMask1'
    MASK_UNCOLORED = 'verticalMaskUncolored'
    MASK_FOCUS = 'verticalMaskFocus'

    static VARIATIONS = {
        normal: 'verticalMask2',
        night: 'verticalMask2Night'
    }

    TITLE = {
        y: 257,
        fontSize: 117,
        get maxWidth() {
            return 1122 - 2 * this._self.previewSize
        },
        _self: this
    }
    TYPES = {
        y: 1964,
        fontSize: 94,
        get maxWidth() {
            return 1052 - 2 * this._self.costSize
        },
        _self: this
    }

    DESCRIPTION_CONFIG = {x: 168, y: 1169, width: 1066, height: 666, fontSize: 94}

    COST = {x: 152, y: 1976, fontSize: 152}
    PREVIEW = {x: 117, y: 257, fontSize: 140}
    ART = {x: 164, y: 2058, fontSize: 47, color: 'white'}
    VERSION = {x: 1239, y: 2058, fontSize: 47, color: 'white'}

    EXPANSION = {x: 1204, y: 1882, width: 94}

    IMG = {border: 117, top: 280, height: 842}

    costSize = 0
    previewSize = 0

    writeDescription() {
        this.ctx.save()
        this.ctx.fillStyle = this._font_color(1)
        super.writeDescription()
        this.ctx.restore()
    }


    paintBaseCard() {
        super.paintBaseCard();
        if (this.data.filter[1] === 'hidden' && this.data.variation === 'normal'){
            this.ctx.drawImage(this.paintedColoredImg(this.MASK_FOCUS, 'black', ''), 0, 0)
        }
    }
}


class HorizontalCardPainter extends CardPainter {
    static WIDTH = 2151
    static HEIGHT = 1403

    BASE = 'horizontal'
    MASK_1 = 'horizontalMask1'
    static VARIATIONS = {default: 'horizontalMask2'}
    MASK_UNCOLORED = 'horizontalMaskUncolored'
    MASK_BORDER = 'horizontalBorder'

    IMG = {border: 130, top: 218, height: 730}

    TITLE = {y: 185, fontSize: 90, maxWidth: 800}
    TYPES = {y: 0, fontSize: 120, maxWidth: 255,}

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
        let filter = this.data.filter[0] === 'screen' ? 'overlay' : this.data.filter[0]
        this.ctx.drawImage(this.paintedColoredImg(this.MASK_BORDER, this.data.color[0], filter), 0, 0)
    }

    writePreview() {
    }
}