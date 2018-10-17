import os
if os.path.isfile('course.json'):
    os.remove('course.json')
if os.path.isfile('course.csv'):
    os.remove('course.csv')

from scrapy import cmdline
cmdline.execute("scrapy crawl course -o course.json".split())