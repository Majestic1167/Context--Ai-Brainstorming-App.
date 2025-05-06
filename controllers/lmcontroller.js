import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmstudio.js";

export const handleBrainstormingAI = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      model: "phi-3.1-mini-128k-instruct",
      stream: true,
    };

    const lmResponse = await axios({
      method: "post",
      url: LM_STUDIO_URL,
      data: payload,
      responseType: "stream",
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    lmResponse.data.pipe(res);
  } catch (error) {
    console.error("Error connecting to LM Studio:", error.message);
    res.status(500).send("Error connecting to LM Studio");
  }
};
