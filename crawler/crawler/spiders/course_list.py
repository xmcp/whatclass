import scrapy
import re

timeroom_description_re=re.compile(r'^(.*?)(?:\(备注：(.+)\))?(?:\|考试.*)?$')

COURSE_TYPES={
    'english': '英语课',
    'speciality': '专业课',
    'politics': '政治课',
    'gym': '体育课',
    'trans_choice': '通选课',
    'pub_choice': '公选课',
    'liberal_computer': '文计课',
    'education_plan_bk': '培养方案',
}
'''
COURSE_TYPES={
'education_plan_bk': '培养方案',
}
'''
def txt(item):
    return item.css('::text').extract()

class CourseSpider(scrapy.Spider):
    name='course'

    def __init__(self,*a,**k):
        super().__init__(*a,**k)
        self.typ_left=list(COURSE_TYPES.keys())

    def start_next_category(self):
        yield scrapy.FormRequest(
            method='POST',
            url='http://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/courseQuery/getCurriculmByForm.do',
            formdata={
                'wlw-radio_button_group_key:{actionForm.courseSettingType}': self.typ_left[0],
                '{actionForm.courseID}': '',
                '{actionForm.courseName}': '',
                'wlw-select_key:{actionForm.deptID}OldValue': 'true',
                'wlw-select_key:{actionForm.deptID}': 'ALL',
                'wlw-select_key:{actionForm.courseDay}OldValue': 'true',
                'wlw-select_key:{actionForm.courseDay}': '',
                'wlw-select_key:{actionForm.courseTime}OldValue': 'true',
                'wlw-select_key:{actionForm.courseTime}': '',
                'wlw-checkbox_key:{actionForm.queryDateFlag}OldValue': 'false',
                'deptIdHide': 'ALL',
            },
            callback=self.parse_page,
            meta={'typ':self.typ_left[0], 'page':1},
        )
        del self.typ_left[0]

    def start_requests(self):
        yield from self.start_next_category()

    def parse_elective_result(self,resp):
        table=resp.css('table.datagrid')[0]
        for row in table.css('tr.datagrid-odd, tr.datagrid-even'):
            cols=row.css('td')
            timedesc_parse=timeroom_description_re.match(
                '|'.join(txt(cols[7]))
            )

            if not timedesc_parse:
                print('invalid timedesc',txt(cols[7]))
                continue

            timeroom,desc=timedesc_parse.groups()
            desc=desc or ''

            yield {
                'type': txt(cols[1]),  # COURSE_TYPES[resp.meta['typ']],
                'name': txt(cols[0]),
                'classid': txt(cols[5]),
                'teacher': txt(cols[4]),
                'school': txt(cols[6]),
                'time_room': timeroom.split('|'),
                'description': desc.split('|'),
            }

    def parse_page(self,resp):
        table=resp.css('table.datagrid')[0]
        for row in table.css('tr.datagrid-odd, tr.datagrid-even'):
            cols=row.css('td')
            yield {
                'type': txt(cols[2]), #COURSE_TYPES[resp.meta['typ']],
                #'id': txt(cols[0]),
                'name': txt(cols[1]),
                'classid': txt(cols[5]),
                'teacher': txt(cols[4]),
                'school': txt(cols[6]),
                'time_room': txt(cols[9]),
                'description': txt(cols[11]),
            }
        #yield {'name': f'{resp.meta["typ"]} {resp.meta["page"]}'}  #####

        for link in table.css('td[align=right] a'):
            if txt(link)[0]=='Next':
                yield resp.follow(
                    link.css('::attr(href)').extract_first(),
                    callback=self.parse_page,
                    meta={'typ': resp.meta['typ'], 'page': resp.meta['page']+1},
                )
                break
        else: # next category
            #print('==== next category')
            if self.typ_left:
                yield from self.start_next_category()
            else: # last: self elective plan
                yield scrapy.Request(
                    url='http://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/electiveWork/showResults.do',
                    callback=self.parse_elective_result,
                    meta={'typ':'result', 'page':1}
                )