from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, DateTime, BLOB, ForeignKey
from sqlalchemy.orm import sessionmaker, DeclarativeBase, declarative_base

engine = create_engine('sqlite:///database.db', echo=True)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String)
    password = Column(String) #hash
    created_at = Column(DateTime, default=datetime.now())
    public_key = Column(String)

    def __repr__(self) -> str:
        return f"(User({self.id}, {self.username}, {self.created_at}, {self.public_key})"

class Message_Queue(Base):
    __tablename__ = "messages_queue"
    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("users.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(BLOB)
    created_at = Column(DateTime, default=datetime.now())

    def __repr__(self) -> str:
        return f"Message({self.id}, {self.recipient_id}, {self.sender_id}, {self.created_at} ,{self.content})"

Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()