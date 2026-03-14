from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, DateTime, BLOB, ForeignKey, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base

from server.connection_code_generator import CONN_CODE_LENGTH, generate_connection_code

engine = create_engine('sqlite:///database.db', echo=True)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String) #hash
    connection_code = Column(String(CONN_CODE_LENGTH), unique=True, index=True, default=generate_connection_code)
    created_at = Column(DateTime, default=datetime.now)
    public_key = Column(String)

    def __repr__(self) -> str:
        return f"(User({self.id}, {self.username}, {self.created_at}, {self.public_key})"

class Message_Queue(Base):
    __tablename__ = "messages_queue"
    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("users.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(BLOB)
    created_at = Column(DateTime, default=datetime.now)

    def __repr__(self) -> str:
        return f"Message({self.id}, {self.recipient_id}, {self.sender_id}, {self.created_at} ,{self.content})"

class ConnectionDB(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    friend_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id"),
    )

    def __repr__(self) -> str:
        return f"Connection({self.id}, {self.user_id}, {self.friend_id}, {self.created_at})"

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()