import React, {PureComponent} from 'react';
import { RadioGroup } from './RadioGroup';
import './Schedule.css';

const MAX_WEEK=17;
const ICON_PREV=' << ';
const ICON_NEXT=' >> ';

export class Schedule extends PureComponent {
    constructor(props) {
        super(props);
        this.db=props.db;
        this.state={
            result: null,
            week: null,
            day: null,
        };
    }

    componentDidMount() {
        this.gettoday();
        this.query(this.props.room);
    }

    componentDidUpdate(prevProps) {
        if(this.props.room!==prevProps.room)
            this.query(this.props.room);
    }

    gettoday() {
        let now=new Date(), start=new Date(1537113600000); // 2018/9/17 0:00 GMT+8
        let cur_week=Math.floor(1+(now-start)/1000/86400/7);
        if(cur_week<1 || cur_week>MAX_WEEK) cur_week=null;
        this.setState({
            week:cur_week,
            day: now.getDay(),
        });
    }

    query(room) {
        const tx=this.db.transaction(['course']);
        const store=tx.objectStore('course');
        const res=store.index('building_room').getAll(room);
        res.onsuccess=(()=>{
            this.setState({
                result: res.result,
            });
        });
    }

    show_result(result) {
        const week=this.state.week;
        const day=this.state.day;
        return result
            .filter((x)=>(
                (!week || x.weeks.indexOf(week)!==-1) &&
                day===x.day
            ))
            .sort((a,b)=>(
                a.time[0]-b.time[0]
            ))
            .map((x,ind)=>(
                <div key={ind}>
                    <hr />
                    <div className="schedule-course">
                        <p>
                            {x.time[0]}-{x.time[1]}
                            &nbsp; <b>{x.name}</b>
                        </p>
                        <p className="desc">{x.type} {x.school} {x.teacher}</p>
                        <p className="desc">{x.day_tip} {x.description}</p>
                    </div>
                </div>
            ));
    }

    change_week(delta) {
        this.setState((prev)=>{
            let week=prev.week+delta;
            if(week<0 || week>MAX_WEEK) week=0;
            return {
                week: week,
            };
        })
    }

    change_day(day) {
        if(day.indexOf(ICON_PREV)!==-1) return this.change_week(-1);
        if(day.indexOf(ICON_NEXT)!==-1) return this.change_week(1);
        day='啊一二三四五六日'.indexOf(day);
        this.setState({
            day: day,
        });
    }

    render() {
        return (
            <div>
                <RadioGroup
                    value={'啊一二三四五六日'.charAt(this.state.day)}
                    options={[(this.state.week-1)+ICON_PREV,'一','二','三','四','五',ICON_NEXT+(this.state.week+1)]}
                    onchange={this.change_day.bind(this)}
                />
                <p>
                    &nbsp; {this.props.room}
                    &nbsp;第 {this.state.week} 周
                    星期{'啊一二三四五六日'.charAt(this.state.day)}
                </p>
                {this.state.result ?
                    this.show_result(this.state.result) :
                    <p>Loading...</p>
                }
            </div>
        );
    }
}