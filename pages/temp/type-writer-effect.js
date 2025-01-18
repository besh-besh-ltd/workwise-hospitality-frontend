import React, { useEffect, useState } from 'react';

const TypewriterEffect = ({ texts }) => {    
    const [displayedText, setDisplayedText] = useState('');
    const [textIndex, setTextIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [letterIndex, setLetterIndex] = useState(0);
    const typingSpeed = 150; 
    const deletingSpeed = 75; 
    const pauseDuration = 1000; 

    useEffect(() => {
        const handleTyping = () => {
            if (isDeleting) {
                setDisplayedText(texts[textIndex].substring(0, letterIndex));
                setLetterIndex(letterIndex - 1);
            } else {
                setDisplayedText(texts[textIndex].substring(0, letterIndex));
                setLetterIndex(letterIndex + 1);
            }

            if (!isDeleting && letterIndex === texts[textIndex].length) {
                setTimeout(() => setIsDeleting(true), pauseDuration);
            }

            if (isDeleting && letterIndex === 0) {
                setIsDeleting(false);
                setTextIndex((textIndex + 1) % texts.length);
                setLetterIndex(0);
            }
        };

        const timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, letterIndex, textIndex]);

    return (
        <div className="typewriter-effect">
            <h2 className='text-danger'>{displayedText}</h2>
        </div>
    );
};

export default TypewriterEffect;