import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "dummy")
os.environ.setdefault("WHATSAPP_API_URL", "https://graph.facebook.com/v20.0")
os.environ.setdefault("WHATSAPP_ACCESS_TOKEN", "dummy-token")
os.environ.setdefault("INTERNAL_MEDIA_TOKEN", "test-token")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.chats import router


class FakeResponse:
    def __init__(self, *, json_data=None, status_code=200, content=b"", text=""):
        self._json_data = json_data or {}
        self.status_code = status_code
        self.content = content
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception("http error")

    def json(self):
        return self._json_data


class FakeTable:
    def __init__(self, stored_messages):
        self.stored_messages = stored_messages
        self._inserted = []

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=list(self.stored_messages))

    def insert(self, payload):
        self._inserted.append(payload)
        self.stored_messages.append(payload)
        return SimpleNamespace(execute=lambda: SimpleNamespace(data=[payload]))



class MediaInboundRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router)
        self.client = TestClient(self.app)
        self.stored_messages = []
        self.fake_table = FakeTable(self.stored_messages)

    def test_inbound_media_requires_internal_token(self):
        response = self.client.post(
            "/chat/media/inbound",
            json={
                "session_id": "51999999999",
                "media_id": "123456789",
                "kind": "audio",
                "mime": "audio/ogg; codecs=opus",
                "filename": "audio.ogg",
                "caption": "",
            },
        )
        self.assertEqual(response.status_code, 401)

    @patch("services.chat_manager.supabase")
    @patch("services.chat_manager.requests.get")
    def test_inbound_media_returns_already_exists_when_duplicate(self, mock_get, mock_supabase):
        fake_client = SimpleNamespace(table=lambda name: self.fake_table)
        mock_supabase.client = fake_client
        mock_get.return_value = FakeResponse(json_data={"url": "https://example.com/file"}, content=b"abc")

        self.fake_table.stored_messages.append({
            "id": 1,
            "message": '{"media": {"whatsapp_media_id": "123456789"}}',
        })

        response = self.client.post(
                "/chat/media/inbound",
                headers={"X-Internal-Token": "test-token"},
                json={
                    "session_id": "51999999999",
                    "media_id": "123456789",
                    "kind": "audio",
                    "mime": "audio/ogg; codecs=opus",
                    "filename": "audio.ogg",
                    "caption": "",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "already_exists")


if __name__ == "__main__":
    unittest.main()
