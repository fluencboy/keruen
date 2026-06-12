"""
Gemini AI integration for:
1. Order extraction from natural language
2. Analytics copilot
"""
import json
import re
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

CHECKPOINT_NAMES = {
    "aktau": "Aktau Port",
    "aktau port": "Aktau Port",
    "kuryk": "Kuryk Port",
    "kuryk port": "Kuryk Port",
    "beineu": "Beineu",
    "zhanaozen": "Zhanaozen",
    "temir-baba": "Temir-Baba",
    "temir baba": "Temir-Baba",
}

ORDER_EXTRACTION_PROMPT = """You are a logistics AI assistant for Keruen, a digital logistics platform in Mangystau, Kazakhstan.

Extract the following fields from the user's cargo request:
- cargo_type: one of [crude_oil, dry_goods, chemicals, grain, machinery, containers, steel, fertilizer, consumer_goods, coal]
- cargo_weight: numeric weight in tons
- origin: one of [Aktau Port, Kuryk Port, Beineu, Zhanaozen, Temir-Baba] or a city name
- destination: one of [Aktau Port, Kuryk Port, Beineu, Zhanaozen, Temir-Baba] or a city name
- desired_date: ISO date string (YYYY-MM-DD), interpret relative dates like "tomorrow" from today ({today})
- company: company name if mentioned, otherwise null

User request: "{prompt}"

Respond ONLY with a valid JSON object, no markdown, no explanation:
{{"cargo_type": "...", "cargo_weight": 0.0, "origin": "...", "destination": "...", "desired_date": "YYYY-MM-DD", "company": null, "confidence": 0.95}}"""

ANALYTICS_PROMPT = """You are an expert logistics analyst for Keruen, the digital logistics control center for Mangystau Region, Kazakhstan.

Current system state:
{system_state}

The analyst asks: "{question}"

Provide a detailed, professional analytical answer based on the data provided. 
Focus on concrete numbers, trends, and actionable recommendations.
Keep response under 300 words. Be specific about locations (Aktau Port, Kuryk Port, Beineu, Zhanaozen, Temir-Baba)."""

async def extract_order_from_text(prompt: str) -> Dict[str, Any]:
    """Use Gemini to extract order details from natural language."""
    from datetime import date
    today = date.today().isoformat()

    if not settings.GEMINI_API_KEY:
        return _fallback_extraction(prompt)

    system_prompt = ORDER_EXTRACTION_PROMPT.format(today=today, prompt=prompt)

    for model in GEMINI_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{GEMINI_BASE_URL.format(model=model)}?key={settings.GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": system_prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512}
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                text = re.sub(r"```json|```", "", text).strip()
                # Extract JSON object robustly — model may include preamble/postamble
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if not match:
                    raise ValueError("No JSON object found in response")
                result = json.loads(match.group())
                result["origin"] = _normalize_location(result.get("origin", ""))
                result["destination"] = _normalize_location(result.get("destination", ""))
                return result
        except Exception as e:
            print(f"Gemini API error ({model}): {e}")
    return _fallback_extraction(prompt)

async def analytics_copilot(question: str, system_state: Dict) -> str:
    """Use Gemini to answer analytics questions about the logistics system."""
    if not settings.GEMINI_API_KEY:
        return _fallback_analytics(question, system_state)

    state_str = json.dumps(system_state, indent=2, default=str)
    prompt = ANALYTICS_PROMPT.format(system_state=state_str, question=question)

    for model in GEMINI_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{GEMINI_BASE_URL.format(model=model)}?key={settings.GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512}
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print(f"Gemini API error ({model}): {e}")
    return _fallback_analytics(question, system_state)

def _normalize_location(loc: str) -> str:
    if not loc:
        return "Aktau Port"
    loc_lower = loc.lower().strip()
    for key, val in CHECKPOINT_NAMES.items():
        if key in loc_lower:
            return val
    return loc

def _fallback_extraction(prompt: str) -> Dict[str, Any]:
    """Rule-based fallback when Gemini is not available."""
    from datetime import date, timedelta
    prompt_lower = prompt.lower()

    cargo_types = {"wheat": "grain", "grain": "grain", "oil": "crude_oil", "crude": "crude_oil",
                   "chemical": "chemicals", "container": "containers", "steel": "steel",
                   "machinery": "machinery", "fertilizer": "fertilizer", "coal": "coal"}
    cargo_type = "dry_goods"
    for key, val in cargo_types.items():
        if key in prompt_lower:
            cargo_type = val
            break

    import re
    weight_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:tons?|tonnes?|т)', prompt_lower)
    weight = float(weight_match.group(1)) if weight_match else 20.0

    origin = "Beineu"
    dest = "Aktau Port"
    for cp in CHECKPOINT_NAMES:
        if cp in prompt_lower:
            for cp2 in CHECKPOINT_NAMES:
                if cp2 != cp and cp2 in prompt_lower:
                    dest = CHECKPOINT_NAMES[cp2]
            origin = CHECKPOINT_NAMES[cp]
            break

    if "tomorrow" in prompt_lower:
        desired_date = (date.today() + timedelta(days=1)).isoformat()
    elif "today" in prompt_lower:
        desired_date = date.today().isoformat()
    else:
        desired_date = (date.today() + timedelta(days=2)).isoformat()

    return {
        "cargo_type": cargo_type,
        "cargo_weight": weight,
        "origin": origin,
        "destination": dest,
        "desired_date": desired_date,
        "company": None,
        "confidence": 0.75
    }

def _fallback_analytics(question: str, system_state: Dict) -> str:
    kpis = system_state.get("kpis", {})
    health = kpis.get("corridor_health_score", 75)
    active = kpis.get("active_shipments", 0)
    wait = kpis.get("avg_waiting_time", 45)

    return (
        f"Based on current system data: The corridor health score is {health:.1f}/100. "
        f"There are {active} active shipments in the network. "
        f"Average waiting time across checkpoints is {wait:.0f} minutes. "
        f"The most congested checkpoint shows elevated processing times. "
        f"Recommendation: Monitor Aktau Port capacity during peak hours (08:00-18:00) "
        f"and consider rerouting through Kuryk Port to reduce bottlenecks. "
        f"Note: Connect GEMINI_API_KEY for AI-powered analysis."
    )
