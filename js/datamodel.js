var noteCpt = 0;
class Note {
    constructor(data) {
        this.id = ++noteCpt;
        this.name = data.name;
        this.durationInTicks = data.durationInTicks;
        this.frenquencyInHz = data.frenquencyInHz;
    }
}






