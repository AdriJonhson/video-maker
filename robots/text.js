const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia').apiKey
const sentenceBoundedDetection  = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu').apikey

const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js')

const nlu = new NaturalLanguageUnderstandingV1({
    iam_apikey: watsonApiKey,
    version: '2018-04-05',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api'
});

async function robot(content){
    await fetchcontentfromwikipedia(content)
    sanitizeContent(content)
    breakContentIntoSentences(content)
    limitMaximumSentence(content)
    await fetchKeywordsOfAllSentences(content)

    async function fetchContentFromWikipedia()
    {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithm  = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2?timeout=300")
        const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm)
        const wikipediaContent = wikipediaResponse.get()

        content.sourceContentOriginal = wikipediaContent.content
    }

    function sanitizeContent()
    {
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)

        content.sourceContentSanitized = withoutDatesInParentheses

        function removeBlankLinesAndMarkdown(text)
        {
            const allLines = text.split('\n')

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if(line.trim().length === 0 || line.trim().startsWith("=")){
                    return false
                }

                return true
            })


            return withoutBlankLinesAndMarkdown.join(' ')
        }

        function removeDatesInParentheses(text)
        {
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
        }
    }

    function breakContentIntoSentences(content)
    {
        content.sentences = []

        const sentences = sentenceBoundedDetection.sentences(content.sourceContentSanitized)

        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    function limitMaximumSentence(content){
        content.sentences = content.sentences.slice(0, content.maximumSentences)
    }

    async function fetchKeywordsOfAllSentences(content){
        for(const sentece of content.sentences){
            sentece.keywords = await fetchWatsonAndReturnKeywords(sentece.text)
        }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features:{
                    keywords: {}
                }
            }, (error, response) => {
                if(error){
                    throw error
                }

                const keywords = response.keywords.map((keyword) => {
                    return keyword.text
                })

                resolve(keywords)
            })
        })
    }
}

module.exports = robot