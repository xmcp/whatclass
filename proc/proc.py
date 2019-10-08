import json
import re

with open('../crawler/crawler/course.json') as f:
    courses_raw=json.load(f)

courses=[]
rooms={}

time_room_re=re.compile(r'^(\d+)~(\d+)周 ([每单双])周周([一二三四五六日])(\d+)~(\d+)节\s*(?:(\D+)(\d+))?$')
desc_room_re=re.compile(r'([理一二三四]教|地学|国关[Cc]?|文史|电教听力)楼?\s*(\d+)')
building_blacklist=['哲学']

def join(l):
    return '\n'.join(l)

history=set()

for course in courses_raw:
    for time_room_txt in course['time_room']:
        time_room_parse=time_room_re.match(time_room_txt)
        
        if not time_room_parse:
            print('invalid time_room',time_room_txt)
            continue

        week_from,week_to,week_type,week_day_str,time_from,time_to,building,room=time_room_parse.groups()
        #print(week_from,week_to,week_type,week_day,time_from,time_to,building,room)

        weeks=list(range(int(week_from),int(week_to)+1))
        if week_type=='单': weeks=[w for w in weeks if w%2==1]
        if week_type=='双': weeks=[w for w in weeks if w%2==0]

        week_day='啊一二三四五六日'.index(week_day_str)

        time_from=int(time_from)
        time_to=int(time_to)
        #print('==','/'.join(map(str,weeks)),week_day)

        if not building or not room:
            desc_room_parse=desc_room_re.search(join(course['description']))
            if not desc_room_parse:
                print('invalid room',building,room,course['description'])
                continue
            else:
                building,room=desc_room_parse.groups()

        if building.startswith('国关'):
            building='国关C'
        if building.endswith('楼'):
            building=building[:-1]

        if (join(course['name']),join(course['teacher']),join(course["classid"]),time_from,week_day,join(course['description'])) in history:
            #print('duplicate',course)
            continue
        history.add((join(course['name']),join(course['teacher']),join(course["classid"]),time_from,week_day,join(course['description'])))

        if building not in building_blacklist:
            rooms.setdefault(building,set()).add(room)

        courses.append({
            'type': course['type'],
            'name': f'{join(course["name"])} ({join(course["classid"])})',
            'teacher': join(course['teacher']),
            'school': join(course['school']),
            'weeks': weeks,
            'day': week_day,
            'time': [time_from,time_to],
            'building_room': f'{building}{room}',
            'day_tip': f'{week_from}~{week_to}周 {week_type}周{week_day_str}',
            'description': join(course['description'])
        })

with open('course_list.json','w',encoding='utf-8') as f:
    json.dump(courses,f,ensure_ascii=True)

def group(li):
    res={}
    for item in li:
        res.setdefault(item[0]+'F',{})[item]=True
    return res

with open('room_list.json','w',encoding='utf-8') as f:
    json.dump({k:group(list(v)) for k,v in rooms.items()},f,ensure_ascii=True,sort_keys=True)