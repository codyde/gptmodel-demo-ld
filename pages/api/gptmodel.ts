import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerClient } from '../../utils/ld-server';
import { getCookie } from 'cookies-next';


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

type Data = {
  aimodel: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  const ldClient = await getServerClient(process.env.LD_SERVER_KEY || "");
  const clientContext: any = getCookie("ldcontext", { req, res });

  const json = decodeURIComponent(clientContext);
  const jsonObject = JSON.parse(json);

  if (req.method === 'POST') {

  const model = await ldClient.variation("aimodel", jsonObject, 'gpt-3.5-turbo');

  let tokens;

  if (model === 'gpt-3.5-turbo') {
    tokens = 3000
  } else {
    tokens = 8000
  }
  
  const query = JSON.parse(req.body);
  // console.log(query.prompt)
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      messages: [{"role": "user", "content": query.prompt}],
      model: model,
      temperature: 0.7,
      max_tokens: tokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  });
  const data = await response.json();
  console.log(data)
  try {
  res.status(200).json(data.choices[0].message.content);
  } catch (error) {
    res.status(500).json({aimodel: data.error.message})
  }
  } else if (req.method === 'GET') {
      const model = await ldClient.variation("aimodel", jsonObject, 'gpt-3.5-turbo');
    res.status(200).json({ aimodel: model })
  }
}
