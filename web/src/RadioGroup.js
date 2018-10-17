import React, { Component } from 'react';
import './RadioGroup.css';

export class RadioGroup extends Component {
    constructor(props) {
        super(props);
        this.do_select=this.props.onchange;
    }

    render() {
        let options=this.props.options;
        if(this.props.sort_key)
            options=options.sort((a,b)=>(
                this.props.sort_key[a]-this.props.sort_key[b]
            ));
        return (
            <div className="radio-group">
                {options.map((option)=>(
                    <span key={option}
                          className={'radio-group-option'+(this.props.value===option?' selected':'')}
                          onClick={()=>this.do_select(option)}
                    >{option}</span>
                ))}
            </div>
        );
    }
}
