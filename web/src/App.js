import React, {Component} from 'react';
import './App.css';
import {RadioGroup} from './RadioGroup';
import {Schedule} from './Schedule';


const DB_ROOM_VER='1';
const DB_COURSE_VER='2';
const INDEXED_DB_VER=1;

const BUILDING_SORT_KEY={
    '理教':0,
    '一教':1,
    '二教':2,
    '三教':3,
    '四教':4,
    '文史':5,
    '地学':6,
    '光华':7,
    '哲学':8,
    '国关C':9,
    '政管':10,
    '电教听力':11,
};

function getkeys(obj,...path) {
    path.forEach((name)=>{
        obj=obj[name]||{};
    });
    return Object.keys(obj);
}

function RadioGroupControl(props) {
    return (
        <div>
            {!!props.options &&
                <RadioGroup options={props.options} value={props.value} onchange={props.onchange} sort_key={props.sort_key} />
            }
        </div>
    )
}

class App extends Component {
    constructor(props) {
        super(props);
        this.state={
            loading_status: 'loading',
            options: {
                'building': null,
                'floor': null,
                'room': null,
            },
        };
        this.rooms={};
    }

    componentDidMount() {
        this.init_db();
    }

    init_room() {
        return new Promise((resolve,reject)=>{
            if(localStorage['DB_ROOM_VER']===DB_ROOM_VER && localStorage['DB_ROOM']) {
                this.rooms=JSON.parse(localStorage['DB_ROOM']);
                return resolve();
            } else {
                console.log('download room list');
                fetch('/data/room_list.json')
                    .then((res)=>res.text())
                    .then((text)=>{
                        localStorage['DB_ROOM']=text;
                        this.rooms=JSON.parse(localStorage['DB_ROOM']);
                        return resolve();
                    })
                    .catch(reject);
            }
        });
    }

    init_course() {
        return new Promise((resolve,reject)=>{
            const open_req=indexedDB.open('course_db',INDEXED_DB_VER);
            open_req.onerror=reject;
            open_req.onupgradeneeded=(event)=>{
                const db=event.target.result;
                const store=db.createObjectStore('course',{autoIncrement: true});
                store.createIndex('building_room','building_room',{unique:false});
            };
            open_req.onsuccess=(event)=>{
                this.db=event.target.result;

                const tx=this.db.transaction(['course'],'readwrite');
                const store=tx.objectStore('course');
                const count_req=store.count();
                count_req.onsuccess=()=>{
                    if(localStorage['DB_COURSE_VER']===DB_COURSE_VER && count_req.result)
                        return resolve();
                    else {
                        console.log('download course list');
                        fetch('/data/course_list.json')
                            .then((res)=>res.json())
                            .then((json)=>{
                                const tx=this.db.transaction(['course'],'readwrite');
                                const store=tx.objectStore('course');
                                tx.oncomplete=resolve;
                                tx.onerror=reject;
                                store.clear();
                                json.forEach((x)=>store.put(x));
                            })
                            .catch(reject);
                    }
                }
            }
        })
    }

    init_db() {
        Promise.all([
            this.init_room(),
            this.init_course()
        ])
            .then(()=>{
                localStorage['DB_ROOM_VER']=DB_ROOM_VER;
                localStorage['DB_COURSE_VER']=DB_COURSE_VER;
                this.setState({
                    loading_status: 'done',
                });
            })
            .catch((e)=>{
                console.log(e);
                this.setState({
                    loading_status: 'failed',
                })
            });
    }

    set_options_meta(name) {
        return (value)=>{
            //console.log('set options',name,value);
            this.setState((prevState)=>{
                const options=Object.assign({},prevState.options);
                if(name==='building')
                    options.floor=options.room=null;
                else if(name==='floor')
                    options.room=null;

                options[name]=value;

                return {
                    options: options,
                };
            });
        }
    }

    render() {
        if(this.state.loading_status==='loading')
            return (
                <div className="container">
                    <br />
                    <p><b>Loading...</b></p>
                    <br />
                    <p>首次使用需要初始化数据库</p>
                    <p>请等待下载完成</p>
                </div>
            );
        else if(this.state.loading_status==='failed')
            return (
                <div className="container">
                    <p><b>Loading Failed!</b></p>
                </div>
            );
        else if(this.state.loading_status==='done')
            return (
                <div className="container">
                    <RadioGroupControl onchange={this.set_options_meta('building')}
                        options={getkeys(this.rooms)} value={this.state.options.building} sort_key={BUILDING_SORT_KEY}
                    />
                    <RadioGroupControl onchange={this.set_options_meta('floor')}
                        options={getkeys(this.rooms,this.state.options.building)} value={this.state.options.floor}
                    />
                    <RadioGroupControl onchange={this.set_options_meta('room')}
                        options={getkeys(this.rooms,this.state.options.building,this.state.options.floor)} value={this.state.options.room}
                    />
                    {(this.state.options.building && this.state.options.floor && this.state.options.room) ?
                        <Schedule
                            db={this.db} room={this.state.options.building+this.state.options.room}
                        /> :
                        <div>
                            <p>选择教室来查看课表</p>
                            <p>数据来自 2018-2019 第一学期 选课系统</p>
                        </div>
                    }
                    <br />
                </div>
            );
    }
}

export default App;
